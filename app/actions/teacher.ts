'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getTeachers() {
    try {
        const { data: teachers, error } = await supabaseAdmin
            .from('teachers')
            .select(`
                *,
                groups(*),
                profile:profiles(*)
            `)
            .order('created_at', { ascending: false })

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
        const { data, error } = await supabaseAdmin
            .from('teachers')
            .insert({ name })
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
        // First unset their ID from any groups (optional if using ON DELETE SET NULL, but good practice)
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
        const updateData: any = {}
        if (data.name) updateData.name = data.name
        if (data.center !== undefined) updateData.center = data.center
        if (data.hall !== undefined) updateData.hall = data.hall

        if (Object.keys(updateData).length > 0) {
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

export async function getTeacherMasterBoards(page = 1, limit = 50) {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data: boards, error, count } = await supabaseAdmin
            .from('teacher_board_master')
            .select(`
                *,
                teacher:teachers(name)
            `, { count: 'exact' })
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
            type: 'teacher_blackboard_image',
            content_url: board.content_url,
            title: board.filename,
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

        // Process groups to count students or extract student list
        const processedGroups = groups?.map((g: any) => ({
            ...g,
            studentCount: g?.members?.length || 0,
            students: g?.members?.map((m: any) => m.student) || []
        })) || []

        // Sort: Groups with students first, then by name
        processedGroups.sort((a, b) => {
            if (a.studentCount > 0 && b.studentCount === 0) return -1
            if (a.studentCount === 0 && b.studentCount > 0) return 1
            return a.name.localeCompare(b.name, undefined, { numeric: true })
        })

        return {
            teacher,
            groups: processedGroups
        }
    } catch (error: any) {
        console.error('Error fetching teacher dashboard data:', error)
        return { error: error.message || '데이터를 불러오는데 실패했습니다.' }
    }
}
