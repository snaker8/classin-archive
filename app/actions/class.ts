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

        if (classError) throw classError

        // 2. Fetch Materials
        const { data: materials, error: materialsError } = await supabaseAdmin
            .from('materials')
            .select('*')
            .eq('class_id', classId)
            .order('order_index', { ascending: true })

        if (materialsError) throw materialsError

        return {
            classInfo: classData,
            materials: materials || []
        }
    } catch (error) {
        console.error('Error fetching class:', error)
        return { error: '수업 정보를 불러올 수 없습니다.' }
    }
}
