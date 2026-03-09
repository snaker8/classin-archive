'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getAllMaterials(page: number = 1, limit: number = 20, search: string = '') {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        let query = supabaseAdmin
            .from('materials')
            .select(`
                *,
                class:classes!inner(
                    title,
                    class_date,
                    student:profiles!classes_student_id_fkey!inner(full_name, center)
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })

        if (activeCenter && activeCenter !== '전체') {
            query = query.eq('class.student.center', activeCenter)
        }

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

        // 1. Get class_ids BEFORE deleting materials
        const { data: materialsToDelete } = await supabaseAdmin
            .from('materials')
            .select('class_id')
            .in('id', materialIds);

        const affectedClassIds = Array.from(new Set(materialsToDelete?.map(m => m.class_id) || []));

        // 2. Delete the materials
        const { error } = await supabaseAdmin
            .from('materials')
            .delete()
            .in('id', materialIds)

        if (error) throw error

        // 3. Check for empty classes and delete them
        if (affectedClassIds.length > 0) {
            for (const classId of affectedClassIds) {
                // Check if any materials remain
                const { count } = await supabaseAdmin
                    .from('materials')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', classId);

                if (count === 0) {
                    console.log(`Auto-deleting empty class: ${classId}`);
                    await supabaseAdmin
                        .from('classes')
                        .delete()
                        .eq('id', classId);
                }
            }
        }

        revalidatePath('/admin/materials')
        revalidatePath('/admin/dashboard')
        // Also revalidate student dashboard since classes might be gone
        revalidatePath('/student/dashboard')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting materials:', error)
        return { error: '자료 삭제 중 오류가 발생했습니다.' }
    }
}

export async function getStudentMaterials(studentId: string, page: number = 1, limit: number = 20) {
    try {
        const from = (page - 1) * limit
        const to = from + limit - 1

        // 1. Get all class IDs for this student
        const { data: classes } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('student_id', studentId)

        const classIds = classes?.map(c => c.id) || []

        if (classIds.length === 0) {
            return { materials: [], total: 0, totalPages: 0 }
        }

        // 2. Get materials for these classes
        const { data, error, count } = await supabaseAdmin
            .from('materials')
            .select(`
                *,
                class:classes(title, class_date)
            `, { count: 'exact' })
            .in('class_id', classIds)
            .not('type', 'in', '("blackboard_image","teacher_blackboard_image")')
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) throw error

        return {
            materials: data,
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        }
    } catch (error: any) {
        console.error('Error in getStudentMaterials:', error)
        return { error: '자료를 불러오지 못했습니다.' }
    }
}
