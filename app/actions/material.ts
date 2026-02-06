'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getAllMaterials(page: number = 1, limit: number = 20, search: string = '') {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = supabaseAdmin
            .from('materials')
            .select(`
                *,
                class:classes(
                    title,
                    class_date,
                    student:profiles!classes_student_id_fkey(full_name)
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })

        if (search) {
            // 1. Find matching classes first (by title or description)
            const { data: matchingClasses } = await supabaseAdmin
                .from('classes')
                .select('id')
                .or(`title.ilike.%${search}%,description.ilike.%${search}%`)

            const classIds = matchingClasses?.map(c => c.id) || []

            // 2. Filter: Material Title OR (Class ID is in found classes)
            if (classIds.length > 0) {
                query = query.or(`title.ilike.%${search}%,class_id.in.(${classIds.join(',')})`)
            } else {
                query = query.ilike('title', `%${search}%`)
            }
        }

        const { data, error, count } = await query
            .range(from, to)

        if (error) {
            console.error('Supabase Query Error:', error)
            throw error
        }

        return {
            materials: data,
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        }
    } catch (error: any) {
        console.error('Error fetching materials:', error)
        return { error: '자료 목록을 불러오지 못했습니다. (' + error.message + ')' }
    }
}

export async function deleteMaterials(materialIds: string[]) {
    try {
        if (!materialIds || materialIds.length === 0) return { success: true }

        const { error } = await supabaseAdmin
            .from('materials')
            .delete()
            .in('id', materialIds)

        if (error) throw error

        revalidatePath('/admin/materials')
        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting materials:', error)
        return { error: '자료 삭제 중 오류가 발생했습니다.' }
    }
}
