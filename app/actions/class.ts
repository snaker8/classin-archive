'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'


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
async function getSignedUrlForMaterial(material: any) {
    if (material.type !== 'blackboard_image' || !material.content_url) {
        return material.content_url;
    }

    // 1. If it's already a full URL, try to extract path
    // folder-monitor.js stores: content_url: publicUrlData.publicUrl
    // which looks like: https://project.supabase.co/storage/v1/object/public/blackboard-images/path/to/file

    const url = material.content_url;
    const bucketName = 'blackboard-images';
    const publicMarker = `/storage/v1/object/public/${bucketName}/`;

    let storagePath = url;
    if (url.includes(publicMarker)) {
        storagePath = url.split(publicMarker)[1];
    }

    if (storagePath === url) {
        // Try checking if it's just the path stored (legacy or different upload)
        // If it doesn't look like a URL, treat as path
        if (url.startsWith('http')) {
            return url; // Cannot extract path, return original
        }
    }

    // Now storagePath should be relative path in bucket
    const { data, error } = await supabaseAdmin
        .storage
        .from(bucketName)
        .createSignedUrl(storagePath, 60 * 60);

    if (error || !data) return url;
    return data.signedUrl;
}


export async function getClass(classId: string) {
    try {
        // We can use supabaseAdmin directly to bypass RLS

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

        // 3. Sign URLs for images
        const materialsWithSignedUrls = await Promise.all((materials || []).map(async (m) => ({
            ...m,
            content_url: await getSignedUrlForMaterial(m)
        })));


        return {
            classInfo: classData,
            materials: materialsWithSignedUrls
        }
    } catch (error: any) {
        console.error('Error fetching class:', error)
        return { error: `서버 오류: ${error.message || '알 수 없는 오류'}` }
    }
}


export async function getAllClasses({ page = 1, limit = 20, search = '' } = {}) {
    try {
        let query = supabaseAdmin
            .from('classes')
            .select(`
        *,
        student:profiles!classes_student_id_fkey(*),
        materials:materials(count)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })

        if (search) {
            query = query.ilike('title', `%${search}%`)
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
    try {
        // 1. Fetch classes for student
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
            .select('class_id, type, content_url, order_index')
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

        // Process classes and SIGN THUMBNAILS
        const processedClasses = await Promise.all(classesData.map(async (cls) => {
            const materials = materialsByClass[cls.id] || []
            const images = materials.filter(m => m.type === 'blackboard_image')
            const videos = materials.filter(m => m.type === 'video_link')

            // Get first image
            let thumbnail = null;
            if (images.length > 0) {
                thumbnail = await getSignedUrlForMaterial(images[0]);
            }

            // Calculate stats
            const today = new Date();
            const createdAt = new Date(cls.created_at);
            const diffTime = Math.abs(today.getTime() - createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isNew = diffDays <= 3;

            // Material Count Logic:
            // 1. Blackboard images (regardless of count) = 1 material
            // 2. Video link = 1 material each
            const materialCount = (images.length > 0 ? 1 : 0) + videos.length;

            return {
                ...cls,
                thumbnail_url: thumbnail,
                material_count: materialCount,
                video_count: videos.length,
                is_new: isNew
            }
        }));

        return { classes: processedClasses }

    } catch (error: any) {
        console.error('Error in getStudentClasses:', error)
        return { error: '수업 목록을 불러오지 못했습니다.' }
    }
}


export async function deleteClass(classId: string) {
    try {
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
            class_date: data.class_date
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
