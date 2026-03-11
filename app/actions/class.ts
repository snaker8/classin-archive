'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { getServerSession, getServerProfile, requireRole, requireCenterAccess } from '@/lib/supabase/server'

// Helper to generate signed URL
async function signStorageUrl(url: string) {
    if (!url) return null;

    try {
        // Extract path from public URL
        // Expected format: .../storage/v1/object/public/bucketName/path/to/file
        // OR simple path if stored that way (unlikely given current code)

        let path = url;
        const publicMarker = '/public/blackboard-images/';
        const index = url.indexOf(publicMarker);

        if (index !== -1) {
            path = url.substring(index + publicMarker.length);
        } else if (url.startsWith('http')) {
            // Handle cases where the URL structure might differ but contains the filename
            // For now, assume strict structure or fallback to original if parsing fails
            // But based on folder-monitor.js: storagePath is simply "studentId/date/filename"
            // And publicUrl is generated from that.
            // We need to reverse-engineer the path from the full URL if we only have the full URL stored.
            // Best bet: The DB stores the full Public URL.
            // Let's try to extract the part after the last slash if standard parsing fails?
            // No, safest is to match the bucket name if part of URL.

            // Let's assume standard Supabase Public URL format for now.
            // invalid if we can't find marker.
            return url;
        }

        // Only sign if we successfully extracted a relative path
        if (path === url) return url;

        const { data, error } = await supabaseAdmin
            .storage
            .from('blackboard-images')
            .createSignedUrl(path, 60 * 60) // 1 hour expiry

        if (error || !data) {
            // console.error('Error signing URL:', error, path); // Optional logging
            return url; // Fallback to public URL
        }

        return data.signedUrl;
    } catch (e) {
        return url;
    }
}

// Improved helper that handles various URL formats or raw paths
async function getSignedUrlsForMaterials(materials: any[]) {
    if (!materials || materials.length === 0) return [];

    const bucketName = 'blackboard-images';
    const markers = [
        `/storage/v1/object/public/${bucketName}/`,
        `/storage/v1/object/authenticated/${bucketName}/`,
        `/public/${bucketName}/`,
        `/authenticated/${bucketName}/`
    ];

    const pathsToSign: string[] = [];
    const materialMap: Record<string, number[]> = {};

    materials.forEach((m: any, idx: number) => {
        if (!m.content_url || (m.type !== 'blackboard_image' && m.type !== 'teacher_blackboard_image')) {
            return;
        }

        const url = m.content_url;
        let storagePath = url;

        for (const marker of markers) {
            if (url.includes(marker)) {
                storagePath = url.split(marker)[1];
                break;
            }
        }

        if (storagePath.startsWith('http') && storagePath.includes(bucketName)) {
            const parts = storagePath.split(bucketName + '/');
            if (parts.length > 1) storagePath = parts[1];
        }

        if (!storagePath.startsWith('http')) {
            pathsToSign.push(storagePath);
            if (!materialMap[storagePath]) materialMap[storagePath] = [];
            materialMap[storagePath].push(idx);
        }
    });

    if (pathsToSign.length === 0) return materials;

    try {
        const { data, error } = await supabaseAdmin
            .storage
            .from(bucketName)
            .createSignedUrls(pathsToSign, 3600);

        if (error) {
            console.error('Batch sign error:', error);
            return materials;
        }

        const newMaterials = [...materials];
        data.forEach((item: any) => {
            const path = item.path;
            if (path && item.signedUrl) {
                const indices = materialMap[path];
                if (indices) {
                    indices.forEach((idx: number) => {
                        newMaterials[idx] = { ...newMaterials[idx], content_url: item.signedUrl };
                    });
                }
            }
        });

        return newMaterials;
    } catch (e) {
        console.error('Batch sign catch error:', e);
        return materials;
    }
}


export async function getClass(classId: string) {
    noStore()
    try {
        const session = await getServerSession()
        if (!session) return { error: '로그인이 필요합니다.' }

        // 1. Fetch Class
        const { data: classData, error: classError } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('id', classId)
            .single()

        if (classError) {
            console.error('Class fetch error:', classError)
            return { error: `수업 조회 오류: ${classError.message}` }
        }

        if (!classData) {
            return { error: '수업을 찾을 수 없습니다 (ID: ' + classId + ')' }
        }

        // 2. Fetch Materials
        const { data: materials, error: materialsError } = await supabaseAdmin
            .from('materials')
            .select('*')
            .eq('class_id', classId)
            .order('order_index', { ascending: true })

        if (materialsError) {
            console.error('Materials fetch error:', materialsError)
            return { error: `자료 조회 오류: ${materialsError.message}` }
        }

        // 3. Sign URLs for images (BATCHED)
        const materialsWithSignedUrls = await getSignedUrlsForMaterials(materials || []);

        return {
            classInfo: classData,
            materials: materialsWithSignedUrls
        }
    } catch (error: any) {
        console.error('Error fetching class:', error)
        return { error: `서버 오류: ${error.message || '알 수 없는 오류'}` }
    }
}


export async function getAllClasses({ page = 1, limit = 20, search = '', date = '', teacherId = '' }: {
    page?: number;
    limit?: number;
    search?: string;
    date?: string;
    teacherId?: string;
} = {}) {
    noStore()
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        let query = supabaseAdmin
            .from('classes')
            .select(`
                *,
                student:profiles!classes_student_id_fkey!inner(*),
                materials:materials(count)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })

        if (activeCenter && activeCenter !== '전체') {
            query = query.eq('student.center', activeCenter)
        }

        if (search) {
            query = query.ilike('title', `%${search}%`)
        }

        if (date) {
            query = query.eq('class_date', date)
        }

        if (teacherId) {
            // Fetch groups assigned to this teacher
            const { data: groups } = await supabaseAdmin
                .from('groups')
                .select('id')
                .eq('teacher_id', teacherId)

            if (groups && groups.length > 0) {
                const groupIds = groups.map((g: any) => g.id)

                // Fetch students in these groups
                const { data: members } = await supabaseAdmin
                    .from('group_members')
                    .select('student_id')
                    .in('group_id', groupIds)

                if (members && members.length > 0) {
                    const studentIds = members.map((m: any) => m.student_id)
                    query = query.in('student_id', studentIds)
                } else {
                    return { classes: [], count: 0 }
                }
            } else {
                return { classes: [], count: 0 }
            }
        }

        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data, error, count } = await query.range(from, to)

        if (error) throw error

        return {
            classes: data || [],
            count: count || 0
        }
    } catch (error: any) {
        console.error('Error fetching all classes:', error)
        return { error: '수업 목록을 불러오는데 실패했습니다.' }
    }
}

export async function getStudentClasses(studentId: string) {
    noStore()
    try {
        const session = await getServerSession()
        if (!session) return { error: '로그인이 필요합니다.' }

        // 1. Security Check: Get target student's profile
        const { data: studentProfile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('center, parent_phone')
            .eq('id', studentId)
            .single()

        if (profileErr || !studentProfile) throw new Error('학생 정보를 찾을 수 없습니다.')

        // Check if requester is a parent of this student
        const requesterProfile = await getServerProfile()
        if (requesterProfile?.role === 'parent') {
            const parentPhone = requesterProfile.email?.replace('@parent.local', '')
            if (!parentPhone || studentProfile.parent_phone !== parentPhone) {
                throw new Error('해당 학생의 학부모가 아닙니다.')
            }
        } else {
            // Ensure requester has access to this student's center
            await requireCenterAccess(studentProfile.center)
        }

        // 2. Fetch classes for student
        const { data: classesData, error: classesError } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('student_id', studentId)
            .order('class_date', { ascending: false })

        if (classesError) throw classesError

        if (!classesData || classesData.length === 0) return { classes: [] }

        const classIds = classesData.map(c => c.id)

        // 2. Fetch materials for these classes (optimized)
        const { data: materialsData, error: materialsError } = await supabaseAdmin
            .from('materials')
            .select('class_id, type, title, content_url, order_index')
            .in('class_id', classIds)
            .order('order_index', { ascending: true })

        if (materialsError) throw materialsError

        // Group materials
        const materialsByClass: Record<string, any[]> = {}
        materialsData?.forEach(material => {
            if (!materialsByClass[material.class_id]) {
                materialsByClass[material.class_id] = []
            }
            materialsByClass[material.class_id].push(material)
        })

        // Initial processing to group materials by class
        const processedClasses = classesData.map((cls) => {
            const allMaterials = materialsByClass[cls.id] || []
            const images = allMaterials.filter(m => m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image')
            const videos = allMaterials.filter(m => m.type === 'video_link')

            // Calculate stats
            const today = new Date();
            const createdAt = new Date(cls.created_at);
            const diffTime = Math.abs(today.getTime() - createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isNew = diffDays <= 3;

            return {
                ...cls,
                material_count: allMaterials.length,
                video_count: videos.length,
                is_new: isNew,
                materials: allMaterials
            }
        });

        // 3. Batch Sign ONLY Thumbnails (Optimized Performance)
        const thumbnailCandidates = processedClasses.map(cls => {
            const images = cls.materials.filter((m: any) => m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image');
            const targetImg = images.find((m: any) => m.type === 'blackboard_image') ||
                images.find((m: any) => m.type === 'teacher_blackboard_image' || (m.title && m.title.startsWith('[T]'))) ||
                images[0];
            return targetImg || null;
        }).filter(Boolean);

        const signedThumbnails = await getSignedUrlsForMaterials(thumbnailCandidates);
        const signedThumbnailMap: Record<string, string> = {};
        signedThumbnails.forEach((m: any) => {
            // We need a way to link back. Let's use content_url as a temporary key if we can't find original.
            // Actually, we can use idx mapping or just matching paths.
        });

        // Simpler way: map by path
        const pathToSignedUrl: Record<string, string> = {};
        signedThumbnails.forEach((st: any) => {
            if (st.content_url) {
                // Find matching original candidate to get its original content_url
                const original = thumbnailCandidates.find((tc: any) => tc.content_url.includes(st.path) || st.content_url.includes(tc.content_url));
                // This is bit fuzzy. Let's use indices.
            }
        });

        // Better way: Just sign them directly and map back by index
        const classesWithThumbnails = processedClasses.map((cls, idx) => {
            const images = cls.materials.filter((m: any) => m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image');
            const targetImg = images.find((m: any) => m.type === 'blackboard_image') ||
                images.find((m: any) => m.type === 'teacher_blackboard_image' || (m.title && m.title.startsWith('[T]'))) ||
                images[0];

            // We don't sign here yet.
            return { ...cls, targetImg };
        });

        const targetsToSign = classesWithThumbnails.map(c => c.targetImg).filter(Boolean);
        const signedTargets = await getSignedUrlsForMaterials(targetsToSign);

        const finalClasses = classesWithThumbnails.map(cls => {
            let thumbnail = cls.thumbnail_url;
            if (cls.targetImg) {
                const signed = signedTargets.find((st: any) =>
                    st.content_url.includes(cls.targetImg.content_url) ||
                    cls.targetImg.content_url.includes(st.content_url) ||
                    (st.path && cls.targetImg.content_url.includes(st.path))
                );
                if (signed) thumbnail = signed.content_url;
            }

            return {
                ...cls,
                thumbnail_url: thumbnail,
                materials: cls.materials // Still keep materials but unsigned for dashboard
            };
        });

        return { classes: finalClasses }

    } catch (error: any) {
        console.error('Error in getStudentClasses:', error)
        return { error: '수업 목록을 불러오지 못했습니다.' }
    }
}


export async function deleteClass(classId: string) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        const { error } = await supabaseAdmin
            .from('classes')
            .delete()
            .eq('id', classId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting class:', error)
        return { error: '수업 삭제 중 오류가 발생했습니다.' }
    }
}

export async function updateClass(classId: string, data: { title?: string; description?: string; class_date?: string }) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        const { error } = await supabaseAdmin
            .from('classes')
            .update(data)
            .eq('id', classId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error updating class:', error)
        return { error: '수업 수정 중 오류가 발생했습니다.' }
    }
}

export async function createClass(data: { student_id: string; title: string; description?: string; class_date: string }) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        const { data: newClass, error } = await supabaseAdmin
            .from('classes')
            .insert(data)
            .select()
            .single()

        if (error) throw error
        return { success: true, class: newClass }
    } catch (error: any) {
        console.error('Error creating class:', error)
        return { error: '수업 생성 중 오류가 발생했습니다.' }
    }
}

export async function createClassForGroup(groupId: string, data: { title: string; description?: string; class_date: string }) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        // 1. Get all members of the group
        const { data: members, error: membersError } = await supabaseAdmin
            .from('group_members')
            .select('student_id')
            .eq('group_id', groupId)

        if (membersError) throw membersError
        if (!members || members.length === 0) return { error: '선택한 반에 학생이 없습니다.' }

        // 2. Prepare class data for each student
        const classesToInsert = members.map(m => ({
            student_id: m.student_id,
            title: data.title,
            description: data.description,
            class_date: data.class_date,
            group_id: groupId
        }))

        // 3. Batch insert classes
        const { data: newClasses, error: insertError } = await supabaseAdmin
            .from('classes')
            .insert(classesToInsert)
            .select()

        if (insertError) throw insertError

        return { success: true, count: newClasses.length, classes: newClasses }
    } catch (error: any) {
        console.error('Error creating class for group:', error)
        return { error: '반 일괄 수업 생성 중 오류가 발생했습니다.' }
    }
}

export async function createMaterials(materials: any[]) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        if (!materials || materials.length === 0) return { success: true, count: 0 };

        const { data, error } = await supabaseAdmin
            .from('materials')
            .insert(materials)
            .select()

        if (error) throw error

        return { success: true, count: data.length, materials: data }
    } catch (error: any) {
        console.error('Error creating materials:', error)
        return { error: '자료 저장 중 오류가 발생했습니다.' }
    }
}

export async function uploadImage(formData: FormData) {
    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])
        const file = formData.get('file') as File
        const path = formData.get('path') as string

        if (!file || !path) throw new Error('File or path missing')

        // Convert file to buffer for Supabase Admin upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await supabaseAdmin
            .storage
            .from('blackboard-images')
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) throw error

        // Get public URL
        const { data: urlData } = supabaseAdmin
            .storage
            .from('blackboard-images')
            .getPublicUrl(path)

        return { success: true, url: urlData.publicUrl }
    } catch (error: any) {
        console.error('Error uploading image:', error)
        return { error: '이미지 업로드 실패: ' + error.message }
    }
}
