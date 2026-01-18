'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getDashboardData() {
    try {
        // 1. Fetch all students
        const { data: students, error: studentsError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .order('created_at', { ascending: false })

        if (studentsError) throw studentsError

        // 2. Fetch recent classes with student info
        const { data: recentClasses, error: classesError } = await supabaseAdmin
            .from('classes')
            .select(`
        *,
        student:profiles!classes_student_id_fkey(*)
      `)
            .order('created_at', { ascending: false })
            .limit(5)

        if (classesError) throw classesError

        // 3. Fetch stats (counts)
        const { count: studentCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')

        const { count: classCount } = await supabaseAdmin
            .from('classes')
            .select('*', { count: 'exact', head: true })

        const { count: materialCount } = await supabaseAdmin
            .from('materials')
            .select('*', { count: 'exact', head: true })

        return {
            students: students || [],
            recentClasses: recentClasses || [],
            stats: {
                totalStudents: studentCount || 0,
                totalClasses: classCount || 0,
                totalMaterials: materialCount || 0,
            }
        }
    } catch (error) {
        console.error('Error in getDashboardData:', error)
        throw new Error('대시보드 데이터를 불러오는데 실패했습니다.')
    }
}
