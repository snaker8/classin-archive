'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// --- Groups CRUD ---

export async function getGroups(search: string = '') {
    try {
        let query = supabaseAdmin
            .from('groups')
            .select(`
                *,
                members:group_members(count),
                teacher:teachers(*)
            `)
        // .order('created_at', { ascending: false }) // Remove DB sort, we will sort in JS

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data, error } = await query

        if (error) throw error

        // Natural sort by name (e.g. "1학년", "2학년", "10학년")
        const groups = data || []
        groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

        return { groups }
    } catch (error: any) {
        console.error('Error fetching groups:', error)
        return { error: '반 목록을 불러오지 못했습니다.' }
    }
}

export async function createGroup(name: string, description: string = '', teacherId: string | null = null) {
    try {
        const { data, error } = await supabaseAdmin
            .from('groups')
            .insert({ name, description, teacher_id: teacherId })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/groups')
        return { success: true, group: data }
    } catch (error: any) {
        console.error('Error creating group:', error)
        if (error.code === '23505') { // Unique violation
            return { error: '이미 존재하는 반 이름입니다.' }
        }
        return { error: '반 생성 중 오류가 발생했습니다.' }
    }
}

export async function updateGroup(groupId: string, name: string, description: string = '', teacherId: string | null = null) {
    try {
        const { data, error } = await supabaseAdmin
            .from('groups')
            .update({ name, description, teacher_id: teacherId })
            .eq('id', groupId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/groups')
        revalidatePath(`/admin/groups/${groupId}`)
        return { success: true, group: data }
    } catch (error: any) {
        console.error('Error updating group:', error)
        if (error.code === '23505') {
            return { error: '이미 존재하는 반 이름입니다.' }
        }
        return { error: '반 수정 중 오류가 발생했습니다.' }
    }
}

export async function deleteGroup(groupId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('groups')
            .delete()
            .eq('id', groupId)

        if (error) throw error

        revalidatePath('/admin/groups')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting group:', error)
        return { error: '반 삭제 중 오류가 발생했습니다.' }
    }
}

// --- Group Members Management ---

export async function getGroupDetails(groupId: string) {
    try {
        // 1. Get Group Info
        const { data: group, error: groupError } = await supabaseAdmin
            .from('groups')
            .select(`
                *,
                teacher:teachers(*)
            `)
            .eq('id', groupId)
            .single()

        if (groupError) throw groupError

        // 2. Get Members
        const { data: members, error: membersError } = await supabaseAdmin
            .from('group_members')
            .select(`
                joined_at,
                student:profiles(*)
            `)
            .eq('group_id', groupId)
            .order('joined_at', { ascending: false })

        if (membersError) throw membersError

        return { group, members: members.map(m => ({ ...m.student, joined_at: m.joined_at })) }
    } catch (error: any) {
        console.error('Error fetching group details:', error)
        return { error: '반 정보를 불러오지 못했습니다.' }
    }
}

export async function addMemberToGroup(groupId: string, studentId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('group_members')
            .insert({ group_id: groupId, student_id: studentId })

        if (error) throw error

        revalidatePath(`/admin/groups/${groupId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Error adding member:', error)
        if (error.code === '23505') {
            return { error: '이미 등록된 학생입니다.' }
        }
        return { error: '학생 추가 중 오류가 발생했습니다.' }
    }
}

export async function removeMemberFromGroup(groupId: string, studentId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('student_id', studentId)

        if (error) throw error

        revalidatePath(`/admin/groups/${groupId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Error removing member:', error)
        return { error: '학생 삭제 중 오류가 발생했습니다.' }
    }
}

export async function deleteGroupSession(classIds: string[]) {
    try {
        if (!classIds || classIds.length === 0) return { success: true }

        // Simply delete all these classes. Cascade deleted materials.
        const { error } = await supabaseAdmin
            .from('classes')
            .delete()
            .in('id', classIds)

        if (error) throw error

        // We can't revalidate specific group path here easily without groupId, 
        // but we can trust the client to refresh or pass groupId if needed.
        // Or we can return success and client refreshes.

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting group session:', error)
        return { error: '수업 삭제 중 오류가 발생했습니다.' }
    }
}


// --- Group Classes / Sessions ---

export async function getGroupSessions(groupId: string) {
    try {
        // 1. Get all student IDs in this group
        const { data: members, error: membersError } = await supabaseAdmin
            .from('group_members')
            .select('student_id')
            .eq('group_id', groupId)

        if (membersError) throw membersError
        if (!members || members.length === 0) return { sessions: [] }

        const studentIds = members.map(m => m.student_id)

        // 2. Fetch ALL classes for these students
        // We fetch minimal data to group them manually in JS
        const { data: classes, error: classesError } = await supabaseAdmin
            .from('classes')
            .select('id, title, class_date, created_at, student_id')
            .in('student_id', studentIds)
            .order('class_date', { ascending: false })

        if (classesError) throw classesError

        // 3. Group by Date + Title
        const sessionsMap = new Map<string, any>()

        for (const cls of classes || []) {
            const key = `${cls.class_date}::${cls.title}`
            if (!sessionsMap.has(key)) {
                sessionsMap.set(key, {
                    key,
                    class_date: cls.class_date,
                    title: cls.title,
                    student_count: 0,
                    total_students: studentIds.length,
                    class_ids: [],
                    created_at: cls.created_at, // Use first one found
                })
            }
            const session = sessionsMap.get(key)
            session.student_count++
            session.class_ids.push(cls.id)
        }

        const sessions = Array.from(sessionsMap.values())

        // 4. Fetch Thumbnail for each session (optimization: usually first class's first image)
        // This might be expensive if many sessions. Let's do it lazy or just fetch for top 20?
        // For now, let's just return list. The UI can fetch details on click.
        // Actually, user wants to see at a glance. Let's fetch one material for each session to show 'has content'.

        // Optimization: Get ALL material headers for these classIDs to count them?
        // Too heavy. Let's just return the sessions and let frontend load details or keep it simple.
        // Or better: Fetch counts for the list view?

        return { sessions }
    } catch (error: any) {
        console.error('Error fetching group sessions:', error)
        return { error: '반 수업 목록을 불러오지 못했습니다.' }
    }
}

export async function getSessionDetails(classIds: string[]) {
    try {
        if (!classIds || classIds.length === 0) return { materials: [] }

        // We only need materials from ONE of the classes to show what represents this session,
        // OR we want to show a Union of all materials?
        // The requirement is "Manage materials for the group".
        // This implies materials should be synced.
        // If we list materials, we should list distinct materials by Title/Type that exist in MOST classes?
        // Let's assume the user wants to see the materials of the FIRST student as a reference.
        // Or better: Get materials from the first classId in the list.

        const referenceClassId = classIds[0]

        const { data: materials, error } = await supabaseAdmin
            .from('materials')
            .select('*')
            .eq('class_id', referenceClassId)
            .order('order_index', { ascending: true })

        if (error) throw error

        return { materials }
    } catch (error: any) {
        console.error('Error fetching session details:', error)
        return { error: '수업 자료를 불러오지 못했습니다.' }
    }
}


export async function addMaterialToSession(classIds: string[], material: { type: string, title: string, url: string }) {
    try {
        if (!classIds || classIds.length === 0) return { error: '수업이 선택되지 않았습니다.' }

        const materialsToInsert = classIds.map(classId => ({
            class_id: classId,
            type: material.type,
            title: material.title,
            url: material.url,
            order_index: 999 // Append to end
        }))

        const { error } = await supabaseAdmin
            .from('materials')
            .insert(materialsToInsert)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error adding material to session:', error)
        return { error: '자료 추가 중 오류가 발생했습니다.' }
    }
}

export async function deleteMaterialFromSession(classIds: string[], materialRef: { title: string, type: string }) {
    try {
        if (!classIds || classIds.length === 0) return { success: true }

        // Determine which materials to delete based on loose matching for the session
        // We delete materials with same Title AND Type from ALL classes in this session
        const { error } = await supabaseAdmin
            .from('materials')
            .delete()
            .in('class_id', classIds)
            .eq('title', materialRef.title)
            .eq('type', materialRef.type)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting material from session:', error)
        return { error: '자료 삭제 중 오류가 발생했습니다.' }
    }
}

export async function getGlobalClassSessions({
    groupIds,
    search = '',
    page = 1,
    limit = 20
}: {
    groupIds?: string[],
    search?: string,
    page?: number,
    limit?: number
}) {
    try {
        // 1. Filter Students based on Groups
        let studentIds: string[] | null = null

        if (groupIds && groupIds.length > 0) {
            const { data: members, error: membersError } = await supabaseAdmin
                .from('group_members')
                .select('student_id')
                .in('group_id', groupIds)

            if (membersError) throw membersError
            studentIds = members.map(m => m.student_id)
        }

        // 2. Build Query for Classes
        let query = supabaseAdmin
            .from('classes')
            .select(`
                id,
                title,
                class_date,
                created_at,
                student_id,
                student:profiles!classes_student_id_fkey(full_name),
                materials:materials(count) 
            `, { count: 'exact' })
        // Note: 'materials' count is raw, not "has content" logic, but good enough for list

        if (studentIds !== null) {
            // IF filter applied but no students found, return empty
            if (studentIds.length === 0) return { sessions: [], total: 0, page, totalPages: 0 }
            query = query.in('student_id', studentIds)
        }

        if (search) {
            // Search Title OR Student Name
            // Searching related tables (profiles.full_name) is hard in one go.
            // Let's search Class Title primarily.
            query = query.ilike('title', `%${search}%`)
        }

        query = query.order('class_date', { ascending: false })
            .order('created_at', { ascending: false })

        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data, error, count } = await query.range(from, to)

        if (error) throw error

        // 3. Map to Session format (Group-aware?)
        // The list is "Classes", mostly individual files.
        // But users want to see "Sessions".
        // A "Session" is commonly defined as: Same Date + Same Title + Same Group.
        // Since we are listing globally, showing individual files (Classes) might be too much if it's 1 file per student.
        // However, the "Class Management" usually manages the *Session* (group of students).
        // But here we are fetching raw classes.
        // If we want "Sessions", we should Group By (Date, Title, GroupId).
        // But checking which Group a student belongs to for *that specific class* is tricky (student can be in multiple groups).
        // For simplicity: We List "Classes" but we try to display them elegantly.
        // OR: We group them in memory if the page size is small enough.
        // Given pagination, grouping across pages is impossible.
        // Strategy: "Class Management" in this context (Global) might conceptually map to "Uploaded Items".
        // IF the user wants filter by Grade/Group, they expect to see "Sessions".
        // Let's try to infer the Group for each class.
        // We can fetch the student's groups.

        // Optimization: Fetch all students' groups for the returned classes.
        const relevantStudentIds = Array.from(new Set((data || []).map(c => c.student_id)))
        const { data: studentGroups } = await supabaseAdmin
            .from('group_members')
            .select('student_id, group:groups(name)')
            .in('student_id', relevantStudentIds)

        const studentGroupMap: Record<string, string[]> = {}
        studentGroups?.forEach((sg: any) => {
            if (!studentGroupMap[sg.student_id]) studentGroupMap[sg.student_id] = []
            if (sg.group) studentGroupMap[sg.student_id].push(sg.group.name)
        })

        const sessions = (data || []).map(cls => ({
            ...cls,
            group_names: studentGroupMap[cls.student_id] || [] // Approximate groups
        }))

        return {
            sessions,
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        }

    } catch (error: any) {
        console.error('Error fetching global sessions:', error)
        return { error: '수업 목록을 불러오지 못했습니다.' }
    }
}
