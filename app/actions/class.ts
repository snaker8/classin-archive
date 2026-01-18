'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'


export async function getClass(classId: string) {
    try {
        // We can use supabaseAdmin directly to bypass RLS, 
        // but typically we should check permissions (is user admin or owner?)
        // For simplicity and speed in this specific 'admin-mostly' context, 
        // we'll fetch data using admin client.

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

        return {
            classInfo: classData,
            materials: materials || []
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
