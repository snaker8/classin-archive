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
            .order('created_at', { ascending: false })

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data, error } = await query

        if (error) throw error

        return { groups: data || [] }
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
