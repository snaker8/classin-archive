'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireCenterAccess, getServerProfile } from '@/lib/supabase/server'

export async function getTeachers() {
    try {
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        const profile = await requireCenterAccess(activeCenter)

        let query = supabaseAdmin
            .from('teachers')
            .select(`
                *,
                groups(*),
                profile:profiles(*)
            `)

        // If not super_manager/전체-admin, force filter by their center
        if (profile.role !== 'super_manager' && !(profile.role === 'admin' && profile.center === '전체')) {
            query = query.eq('center', profile.center)
        } else if (activeCenter && activeCenter !== '전체') {
            query = query.eq('center', activeCenter)
        }

        const { data: teachers, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        // Sort groups for each teacher naturally
        teachers?.forEach((teacher: any) => {
            if (teacher.groups) {
                teacher.groups.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }))
            }
        })

        return { teachers }
    } catch (error: any) {
        console.error('Error fetching teachers:', error)
        return { error: error.message }
    }
}

export async function createTeacher(name: string) {
    try {
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        const profile = await requireCenterAccess(activeCenter)

        const insertData: any = { name }
        // Use user's center if they are restricted
        if (profile.role !== 'super_manager' && !(profile.role === 'admin' && profile.center === '전체')) {
            insertData.center = profile.center
        } else if (activeCenter && activeCenter !== '전체') {
            insertData.center = activeCenter
        }

        const { data, error } = await supabaseAdmin
            .from('teachers')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/teachers')
        return { success: true, teacher: data }
    } catch (error: any) {
        console.error('Error creating teacher:', error)
        return { success: false, error: error.message }
    }
}

export async function registerTeacherProfile(data: { name: string; center?: string; hall?: string; profile_id: string }) {
    try {
        // Check if teacher record already exists for this profile
        const { data: existing } = await supabaseAdmin
            .from('teachers')
            .select('id')
            .eq('profile_id', data.profile_id)
            .single()

        if (existing) {
            return { success: true, teacher: existing }
        }

        const insertData: any = {
            name: data.name,
            profile_id: data.profile_id
        }
        if (data.center) insertData.center = data.center
        if (data.hall) insertData.hall = data.hall

        const { data: newTeacher, error } = await supabaseAdmin
            .from('teachers')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/teachers')
        return { success: true, teacher: newTeacher }
    } catch (error: any) {
        console.error('Error registering teacher profile:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteTeacher(id: string) {
    try {
        // Security check: ensure user has access to this teacher's center
        const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('center')
            .eq('id', id)
            .single()

        if (teacher) {
            await requireCenterAccess(teacher.center)
        }

        // First unset their ID from any groups
        await supabaseAdmin
            .from('groups')
            .update({ teacher_id: null })
            .eq('teacher_id', id)

        const { error } = await supabaseAdmin
            .from('teachers')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/teachers')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting teacher:', error)
        return { success: false, error: error.message }
    }
}

export async function updateTeacher(teacherId: string, data: { name?: string; center?: string; hall?: string }) {
    try {
        // Security check: ensure user has access to this teacher's center
        const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('center')
            .eq('id', teacherId)
            .single()

        if (teacher) {
            await requireCenterAccess(teacher.center)
        }

        const updateData: any = {}
        if (data.name) updateData.name = data.name
        if (data.center !== undefined) updateData.center = data.center
        if (data.hall !== undefined) updateData.hall = data.hall

        if (Object.keys(updateData).length > 0) {
            // Also check access if they are moving teacher to a NEW center
            if (data.center) {
                await requireCenterAccess(data.center)
            }

            const { error } = await supabaseAdmin
                .from('teachers')
                .update(updateData)
                .eq('id', teacherId)

            if (error) throw error
        }

        revalidatePath('/admin/teachers')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating teacher:', error)
        return { success: false, error: error.message }
    }
}

export async function updateTeacherAssignments(teacherId: string, groupIds: string[]) {
    try {
        // 1. Unassign all groups currently assigned to this teacher
        const { error: unassignError } = await supabaseAdmin
            .from('groups')
            .update({ teacher_id: null })
            .eq('teacher_id', teacherId)

        if (unassignError) throw unassignError

        // 2. Assign selected groups to this teacher
        if (groupIds.length > 0) {
            const { error: assignError } = await supabaseAdmin
                .from('groups')
                .update({ teacher_id: teacherId })
                .in('id', groupIds)

            if (assignError) throw assignError
        }

        revalidatePath('/admin/teachers')
        revalidatePath('/admin/groups') // Also refresh groups page
        return { success: true }
    } catch (error: any) {
        console.error('Error updating teacher assignments:', error)
        return { success: false, error: error.message }
    }
}

export async function getTeacherBoards(page = 1, limit = 50) {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data: materials, error, count } = await supabaseAdmin
            .from('materials')
            .select(`
                *,
                classes (
                    id,
                    title,
                    class_date,
                    student:profiles!classes_student_id_fkey(full_name)
                )
            `, { count: 'exact' })
            .eq('type', 'teacher_blackboard_image')
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) throw error

        // Group by content_url
        const uniqueBoardsMap = new Map<string, any>()

        materials?.forEach((m: any) => {
            if (!uniqueBoardsMap.has(m.content_url)) {
                uniqueBoardsMap.set(m.content_url, {
                    url: m.content_url,
                    created_at: m.created_at,
                    usages: []
                })
            }
            const board = uniqueBoardsMap.get(m.content_url)
            board.usages.push({
                material_id: m.id,
                class_title: m.classes?.title,
                student_name: m.classes?.student?.full_name,
                class_date: m.classes?.class_date,
                class_id: m.class_id
            })
        })

        const boards = Array.from(uniqueBoardsMap.values())
        return { boards, total: count }
    } catch (error: any) {
        console.error('Error fetching teacher boards:', error)
        return { error: error.message }
    }
}

export async function distributeTeacherBoard(formData: FormData) {
    try {
        const { uploadImage } = await import('@/app/actions/class')

        const file = formData.get('file') as File
        const date = formData.get('date') as string
        const groupId = formData.get('groupId') as string

        if (!file || !date) throw new Error('File and Date are required')

        const extension = file.name.split('.').pop() || 'png'
        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")
        const fileName = `teacher-uploads/${date}/${Date.now()}-${baseName}.${extension}`

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('path', fileName)

        const { url, error: uploadError } = await uploadImage(uploadFormData)
        if (uploadError) throw new Error(uploadError)

        let query = supabaseAdmin
            .from('classes')
            .select('id')
            .eq('class_date', date)

        if (groupId && groupId !== 'all') {
            const { data: members } = await supabaseAdmin
                .from('group_members')
                .select('student_id')
                .eq('group_id', groupId)

            if (members && members.length > 0) {
                const studentIds = members.map(m => m.student_id)
                query = query.in('student_id', studentIds)
            } else {
                return { success: false, error: '선택한 그룹에 학생이 없습니다.' }
            }
        }

        const { data: classes, error: classError } = await query

        if (classError) throw classError
        if (!classes || classes.length === 0) return { success: false, error: '해당 날짜/조건에 맞는 수업이 없습니다.' }

        const materialsToInsert = classes.map(cls => ({
            class_id: cls.id,
            type: 'teacher_blackboard_image',
            content_url: url,
            order_index: 0
        }))

        const { error: insertError } = await supabaseAdmin
            .from('materials')
            .insert(materialsToInsert)

        if (insertError) throw insertError

        revalidatePath('/admin/teachers')
        return { success: true, count: classes.length }

    } catch (error: any) {
        console.error('Error distributing board:', error)
        return { success: false, error: error.message }
    }
}

export async function getTeacherMasterBoards(page = 1, limit = 50, filters?: { searchTerm?: string; teacherId?: string }) {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabaseAdmin
            .from('teacher_board_master')
            .select(`
                *,
                teacher:teachers(name)
            `, { count: 'exact' })

        if (filters?.searchTerm) {
            query = query.ilike('filename', `%${filters.searchTerm}%`)
        }
        if (filters?.teacherId && filters.teacherId !== 'all') {
            query = query.eq('teacher_id', filters.teacherId)
        }

        const { data: boards, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) throw error

        // Also get usage counts from materials table
        const urls = boards?.map(b => b.content_url) || []
        if (urls.length > 0) {
            const { data: usages } = await supabaseAdmin
                .from('materials')
                .select('content_url')
                .in('content_url', urls)

            const usageCounts = new Map<string, number>()
            usages?.forEach(u => {
                usageCounts.set(u.content_url, (usageCounts.get(u.content_url) || 0) + 1)
            })

            boards?.forEach(b => {
                b.usage_count = usageCounts.get(b.content_url) || 0
            })
        }

        return { boards, total: count }
    } catch (error: any) {
        console.error('Error fetching master boards:', error)
        return { error: error.message }
    }
}

export async function deleteTeacherMasterBoard(boardId: string) {
    try {
        // 1. Get board to find content_url
        const { data: board, error: fetchError } = await supabaseAdmin
            .from('teacher_board_master')
            .select('content_url')
            .eq('id', boardId)
            .single()

        if (fetchError || !board) throw new Error('Board not found')

        // 2. Delete from teacher_board_master
        const { error: deleteRecordError } = await supabaseAdmin
            .from('teacher_board_master')
            .delete()
            .eq('id', boardId)

        if (deleteRecordError) throw deleteRecordError

        // 3. Delete from storage bucket if possible
        // Note: content_url might be a public URL, we need to extract the path
        try {
            const urlPath = board.content_url.split('/object/public/materials/')[1]
            if (urlPath) {
                await supabaseAdmin.storage
                    .from('materials')
                    .remove([urlPath])
            }
        } catch (storageError) {
            console.warn('Could not delete storage file:', storageError)
        }

        revalidatePath('/admin/teachers/boards')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting master board:', error)
        return { success: false, error: error.message }
    }
}

export async function uploadTeacherMasterBoard(formData: FormData) {
    try {
        const { uploadImage } = await import('@/app/actions/class')

        const file = formData.get('file') as File
        const date = formData.get('date') as string
        const teacherId = formData.get('teacherId') as string

        if (!file || !date) throw new Error('File and Date are required')

        const extension = file.name.split('.').pop() || 'png'
        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")
        const fileName = `teacher-gallery/${date}/${Date.now()}-${baseName}.${extension}`

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('path', fileName)

        const { url, error: uploadError } = await uploadImage(uploadFormData)
        if (uploadError) throw new Error(uploadError)

        const { data, error } = await supabaseAdmin
            .from('teacher_board_master')
            .insert({
                content_url: url,
                class_date: date,
                teacher_id: teacherId || null,
                filename: file.name
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/teachers/boards')
        return { success: true, board: data }
    } catch (error: any) {
        console.error('Error uploading master board:', error)
        return { success: false, error: error.message }
    }
}

export async function distributeFromMaster(boardId: string, groupId: string) {
    try {
        // 1. Get board details
        const { data: board, error: boardError } = await supabaseAdmin
            .from('teacher_board_master')
            .select('*')
            .eq('id', boardId)
            .single()

        if (boardError || !board) throw new Error('Board not found')

        // 2. Find target classes
        let query = supabaseAdmin
            .from('classes')
            .select('id')
            .eq('class_date', board.class_date)

        if (groupId && groupId !== 'all') {
            const { data: members } = await supabaseAdmin
                .from('group_members')
                .select('student_id')
                .eq('group_id', groupId)

            if (members && members.length > 0) {
                const studentIds = members.map(m => m.student_id)
                query = query.in('student_id', studentIds)
            } else {
                return { success: false, error: '선택한 그룹에 학생이 없습니다.' }
            }
        }

        const { data: classes, error: classError } = await query
        if (classError) throw classError
        if (!classes || classes.length === 0) return { success: false, error: '해당 날짜/조건에 맞는 수업이 없습니다.' }

        // 3. Filter classes that DON'T have this board yet
        const classIds = classes.map(c => c.id)
        const { data: existing } = await supabaseAdmin
            .from('materials')
            .select('class_id')
            .eq('content_url', board.content_url)
            .in('class_id', classIds)

        const existingClassIds = new Set(existing?.map(e => e.class_id))
        const targetClassIds = classIds.filter(id => !existingClassIds.has(id))

        if (targetClassIds.length === 0) {
            return { success: true, count: 0, message: '이미 모든 대상 수업에 배포되어 있습니다.' }
        }

        // 4. Batch insert materials
        const materialsToInsert = targetClassIds.map(clsId => ({
            class_id: clsId,
            type: 'blackboard_image',
            content_url: board.content_url,
            title: `[T] ${board.filename}`,
            order_index: 0
        }))

        const { error: insertError } = await supabaseAdmin
            .from('materials')
            .insert(materialsToInsert)

        if (insertError) throw insertError

        revalidatePath('/admin/teachers/boards')
        return { success: true, count: targetClassIds.length }
    } catch (error: any) {
        console.error('Error distributing from master:', error)
        return { success: false, error: error.message }
    }
}



export async function getTeacherDashboardData(profileId: string) {
    try {
        // 1. Get Teacher Info
        const { data: teacher, error: teacherError } = await supabaseAdmin
            .from('teachers')
            .select('*')
            .eq('profile_id', profileId)
            .single()

        if (teacherError) throw teacherError
        if (!teacher) throw new Error('선생님 정보를 찾을 수 없습니다.')

        // 2. Get Assigned Groups
        const { data: groups, error: groupsError } = await supabaseAdmin
            .from('groups')
            .select(`
                *,
                members:group_members(
                    student:profiles(*)
                )
            `)
            .eq('teacher_id', teacher.id)

        if (groupsError) throw groupsError

        // 3. For each group, get the latest class and its preview image
        const processedGroups = await Promise.all(groups.map(async (g: any) => {
            // Get latest class from students in this group
            const studentIds = g.members?.map((m: any) => m.student?.id).filter(Boolean) || []

            let latestClass = null
            if (studentIds.length > 0) {
                const { data } = await supabaseAdmin
                    .from('classes')
                    .select(`
                        id,
                        title,
                        class_date,
                        materials (
                            type,
                            content_url,
                            title
                        )
                    `)
                    .in('student_id', studentIds)
                    .order('class_date', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                latestClass = data
            }

            let previewImage = null
            if (latestClass?.materials) {
                // Prioritize teacher_blackboard_image, then blackboard_image, then video thumbnail (if exists)
                const board = latestClass.materials.find((m: any) => m.type === 'teacher_blackboard_image' || m.type === 'blackboard_image')
                if (board) {
                    previewImage = board.content_url
                }
            }

            return {
                ...g,
                studentCount: g?.members?.length || 0,
                students: g?.members?.map((m: any) => m.student) || [],
                latestClass: latestClass ? {
                    id: latestClass.id,
                    title: latestClass.title,
                    date: latestClass.class_date,
                    previewImage
                } : null
            }
        }))

        // Sort: Groups with students first, then by name
        processedGroups.sort((a, b) => {
            if (a.studentCount > 0 && b.studentCount === 0) return -1
            if (a.studentCount === 0 && b.studentCount > 0) return 1
            return a.name.localeCompare(b.name, undefined, { numeric: true })
        })

        // 4. Get recent materials for these groups
        let recentMaterials = []
        const classIds = processedGroups
            .filter(g => g.latestClass)
            .map(g => g.latestClass.id)
            .filter(Boolean)

        if (classIds.length > 0) {
            const { data: materialsData } = await supabaseAdmin
                .from('materials')
                .select('*')
                .in('class_id', classIds)
                .not('type', 'in', '("blackboard_image","teacher_blackboard_image")')
                .order('created_at', { ascending: false })
                .limit(5)

            if (materialsData) {
                recentMaterials = materialsData
            }
        }

        return {
            teacher,
            groups: processedGroups,
            recentMaterials
        }
    } catch (error: any) {
        console.error('Error fetching teacher dashboard data:', error)
        return { error: error.message || '데이터를 불러오는데 실패했습니다.' }
    }
}

export async function getTeacherDashboardDataByTeacherId(teacherId: string) {
    try {
        const profile = await getServerProfile()
        if (!profile) throw new Error('인증이 필요합니다.')

        // 1. Get Teacher Info
        const { data: teacher, error: teacherError } = await supabaseAdmin
            .from('teachers')
            .select('*')
            .eq('id', teacherId)
            .single()

        if (teacherError) throw teacherError
        if (!teacher) throw new Error('선생님 정보를 찾을 수 없습니다.')

        // Check permission: Must be the teacher themselves or an authorized center admin
        if (profile.role === 'teacher') {
            if (profile.id !== teacher.profile_id) {
                throw new Error('다른 선생님의 데이터에 접근할 권한이 없습니다.')
            }
        } else {
            // Must be admin/manager with access to this teacher's center
            await requireCenterAccess(teacher.center)
        }

        // 2. Get Assigned Groups
        const { data: groups, error: groupsError } = await supabaseAdmin
            .from('groups')
            .select(`
                *,
                members:group_members(
                    student:profiles(*)
                )
            `)
            .eq('teacher_id', teacher.id)

        if (groupsError) throw groupsError

        // 3. For each group, get the latest class and its preview image
        const processedGroups = await Promise.all(groups.map(async (g: any) => {
            // Get latest class from students in this group
            const studentIds = g.members?.map((m: any) => m.student?.id).filter(Boolean) || []

            let latestClass = null
            if (studentIds.length > 0) {
                const { data } = await supabaseAdmin
                    .from('classes')
                    .select(`
                        id,
                        title,
                        class_date,
                        materials (
                            type,
                            content_url,
                            title
                        )
                    `)
                    .in('student_id', studentIds)
                    .order('class_date', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                latestClass = data
            }

            let previewImage = null
            if (latestClass?.materials) {
                // Prioritize teacher_blackboard_image, then blackboard_image, then video thumbnail (if exists)
                const board = latestClass.materials.find((m: any) => m.type === 'teacher_blackboard_image' || m.type === 'blackboard_image')
                if (board) {
                    previewImage = board.content_url
                }
            }

            return {
                ...g,
                studentCount: g?.members?.length || 0,
                students: g?.members?.map((m: any) => m.student) || [],
                latestClass: latestClass ? {
                    id: latestClass.id,
                    title: latestClass.title,
                    date: latestClass.class_date,
                    previewImage
                } : null
            }
        }))

        // Sort: Groups with students first, then by name
        processedGroups.sort((a, b) => {
            if (a.studentCount > 0 && b.studentCount === 0) return -1
            if (a.studentCount === 0 && b.studentCount > 0) return 1
            return a.name.localeCompare(b.name, undefined, { numeric: true })
        })

        // 4. Get recent materials for these groups
        let recentMaterials = []
        const classIds = processedGroups
            .filter(g => g.latestClass)
            .map(g => g.latestClass.id)
            .filter(Boolean)

        if (classIds.length > 0) {
            const { data: materialsData } = await supabaseAdmin
                .from('materials')
                .select('*')
                .in('class_id', classIds)
                .not('type', 'in', '("blackboard_image","teacher_blackboard_image")')
                .order('created_at', { ascending: false })
                .limit(5)

            if (materialsData) {
                recentMaterials = materialsData
            }
        }

        return {
            teacher,
            groups: processedGroups,
            recentMaterials
        }
    } catch (error: any) {
        console.error('Error fetching teacher dashboard data by ID:', error)
        return { error: error.message || '데이터를 불러오는데 실패했습니다.' }
    }
}
