'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/supabase/server'

/**
 * Reset all class-related data.
 * This deletes:
 * 1. teacher_board_master
 * 2. classes (and cascading materials/notes)
 */
export async function deleteAllClassData() {
    try {
        await requireRole(['admin', 'super_manager'])
        console.log('Starting full data reset...')

        // 1. Delete Teacher Board Master Records
        const { error: teacherBoardError } = await supabaseAdmin
            .from('teacher_board_master')
            .delete()
            .not('id', 'is', null)

        if (teacherBoardError) {
            console.error('Error deleting teacher boards:', teacherBoardError)
            throw teacherBoardError
        }

        // 2. Delete Classes (Cascades to materials and notes)
        const { error: classError } = await supabaseAdmin
            .from('classes')
            .delete()
            .not('id', 'is', null)

        if (classError) {
            console.error('Error deleting classes:', classError)
            throw classError
        }

        console.log('Data reset successful.')

        // Revalidate relevant paths
        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/groups')
        revalidatePath('/admin/materials')
        revalidatePath('/admin/teachers/boards')

        return { success: true }
    } catch (error: any) {
        console.error('Failed to reset data:', error)
        return { error: `초기화 실패: ${error.message || '알 수 없는 오류'}` }
    }
}

/**
 * Delete classes that have no materials.
 */
export async function deleteEmptyClasses() {
    try {
        await requireRole(['admin', 'super_manager'])
        console.log('Searching for empty classes...')

        // 1. Find all class IDs
        const { data: allClasses, error: classError } = await supabaseAdmin
            .from('classes')
            .select('id')

        if (classError) throw classError

        let deletedCount = 0
        for (const cls of (allClasses || [])) {
            // Check material count
            const { count, error: countError } = await supabaseAdmin
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', cls.id)

            if (countError) continue

            if (count === 0) {
                // Delete empty class
                const { error: deleteError } = await supabaseAdmin
                    .from('classes')
                    .delete()
                    .eq('id', cls.id)

                if (!deleteError) deletedCount++
            }
        }

        console.log(`Successfully deleted ${deletedCount} empty classes.`)

        revalidatePath('/admin/dashboard')
        return { success: true, deletedCount }
    } catch (error: any) {
        console.error('Failed to delete empty classes:', error)
        return { error: `정리 실패: ${error.message}` }
    }
}
