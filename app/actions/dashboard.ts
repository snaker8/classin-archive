'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'

export async function getDashboardData(center?: string, hall?: string) {
    noStore()
    try {
        let studentQuery = supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'student')

        if (center && center !== '전체') {
            studentQuery = studentQuery.eq('center', center)
        }
        if (hall && hall !== '전체') {
            studentQuery = studentQuery.eq('hall', hall)
        }

        const { data: students, error: studentsError } = await studentQuery
            .order('created_at', { ascending: false })

        if (studentsError) throw studentsError

        // 2. Fetch recent classes with student info
        let classesQuery = supabaseAdmin
            .from('classes')
            .select(`
                *,
                student:profiles!classes_student_id_fkey(*)
            `)

        if (center && center !== '전체') {
            classesQuery = classesQuery.filter('student.center', 'eq', center)
        }
        if (hall && hall !== '전체') {
            classesQuery = classesQuery.filter('student.hall', 'eq', hall)
        }

        const { data: recentClassesRaw, error: classesError } = await classesQuery
            .order('created_at', { ascending: false })
            .limit(5)

        if (classesError) throw classesError

        // Filter out null results (which happen if join doesn't match filter)
        const recentClasses = recentClassesRaw?.filter(c => c.student) || []

        // 3. Fetch stats (counts)
        let studentCountQuery = supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')

        if (center && center !== '전체') {
            studentCountQuery = studentCountQuery.eq('center', center)
        }
        if (hall && hall !== '전체') {
            studentCountQuery = studentCountQuery.eq('hall', hall)
        }

        const { count: studentCount } = await studentCountQuery

        // For classes and materials
        let classCountQuery = supabaseAdmin
            .from('classes')
            .select('id, student:profiles!classes_student_id_fkey!inner(center, hall)', { count: 'exact', head: true })

        if (center && center !== '전체') {
            classCountQuery = classCountQuery.eq('student.center', center)
        }
        if (hall && hall !== '전체') {
            classCountQuery = classCountQuery.eq('student.hall', hall)
        }

        const { count: classCount } = await classCountQuery

        let materialCountQuery = supabaseAdmin
            .from('materials')
            .select('id, class:classes!inner(student:profiles!classes_student_id_fkey!inner(center, hall))', { count: 'exact', head: true })

        if (center && center !== '전체') {
            materialCountQuery = materialCountQuery.eq('class.student.center', center)
        }
        if (hall && hall !== '전체') {
            materialCountQuery = materialCountQuery.eq('class.student.hall', hall)
        }

        const { count: materialCount } = await materialCountQuery

        // 4. Get unique class titles for filtering
        const { data: allClasses } = await supabaseAdmin
            .from('classes')
            .select('title, student_id')

        const uniqueClassTitles = [...new Set((allClasses || []).map(c => c.title))].sort()

        // Build student-to-class mapping
        const studentClassMap: Record<string, Set<string>> = {}
        for (const cls of (allClasses || [])) {
            if (!studentClassMap[cls.student_id]) {
                studentClassMap[cls.student_id] = new Set()
            }
            studentClassMap[cls.student_id].add(cls.title)
        }

        return {
            students: students || [],
            recentClasses: recentClasses || [],
            uniqueClassTitles,
            studentClassMap: Object.fromEntries(
                Object.entries(studentClassMap).map(([k, v]) => [k, Array.from(v)])
            ),
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
