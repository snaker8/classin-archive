'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getTeachers() {
    try {
        const { data: teachers, error } = await supabaseAdmin
            .from('teachers')
            .select(`
                *,
                groups(*)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

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
