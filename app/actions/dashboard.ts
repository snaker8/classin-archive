'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { requireRole } from '@/lib/supabase/server'

export async function getDashboardData(centerParam?: string, hallParam?: string) {
    noStore()

    // Read from cookies if not explicitly provided
    const cookieStore = cookies()
    const center = centerParam || cookieStore.get('active_center')?.value
    const hall = hallParam

    try {
        await requireRole(['admin', 'manager', 'super_manager', 'teacher'])

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

        // 2. Fetch recent classes that have materials
        let recentClassesQuery = supabaseAdmin
            .from('classes')
            .select(`
                *,
                student:profiles!classes_student_id_fkey!inner(*),
                materials!inner(id)
            `)

        if (center && center !== '전체') {
            recentClassesQuery = recentClassesQuery.eq('student.center', center)
        }
        if (hall && hall !== '전체') {
            recentClassesQuery = recentClassesQuery.eq('student.hall', hall)
        }

        const { data: recentClasses, error: classesError } = await recentClassesQuery
            .order('class_date', { ascending: false })
            .limit(5)

        if (classesError) throw classesError

        // 3. Fetch stats (counts)
        // ... (studentCountQuery remains same) ...
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
            .select('id, materials!inner(id), student:profiles!classes_student_id_fkey!inner(center, hall)', { count: 'exact', head: true })

        if (center && center !== '전체') {
            classCountQuery = classCountQuery.eq('student.center', center)
        }
        if (hall && hall !== '전체') {
            classCountQuery = classCountQuery.eq('student.hall', hall)
        }

        const { count: classCount } = await classCountQuery

        // Instead of exact counting which inflates by student count, we fetch content_urls
        // to count unique distinct materials/videos distributed
        // Count unique materials by content_url to avoid inflating by student count
        // (e.g. a group class with 10 students sharing the same blackboard = 1, not 10)
        let materialsQuery = supabaseAdmin
            .from('materials')
            .select('content_url, type, class:classes!inner(student:profiles!classes_student_id_fkey!inner(center, hall))')

        if (center && center !== '전체') {
            materialsQuery = materialsQuery.eq('class.student.center', center)
        }
        if (hall && hall !== '전체') {
            materialsQuery = materialsQuery.eq('class.student.hall', hall)
        }

        const { data: allMaterialsData, error: allMaterialsError } = await materialsQuery

        if (allMaterialsError) throw allMaterialsError

        const uniqueVideos = new Set<string>()
        const uniqueBlackboards = new Set<string>()

        for (const m of (allMaterialsData || [])) {
            if (!m.content_url) continue
            if (m.type === 'video_link') {
                uniqueVideos.add(m.content_url)
            } else if (m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image') {
                uniqueBlackboards.add(m.content_url)
            }
        }

        const videoCount = uniqueVideos.size
        const blackboardCount = uniqueBlackboards.size
        const materialCount = videoCount + blackboardCount


        // 4. Get unique class titles for filtering (only active classes)
        let allClassesQuery = supabaseAdmin
            .from('classes')
            .select('title, student_id, materials!inner(id), student:profiles!classes_student_id_fkey!inner(center, hall)')

        if (center && center !== '전체') {
            allClassesQuery = allClassesQuery.eq('student.center', center)
        }
        if (hall && hall !== '전체') {
            allClassesQuery = allClassesQuery.eq('student.hall', hall)
        }

        const { data: allClasses } = await allClassesQuery

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
                videoCount: videoCount || 0,
                blackboardCount: blackboardCount || 0,
            }
        }
    } catch (error) {
        console.error('Error in getDashboardData:', error)
        throw new Error('대시보드 데이터를 불러오는데 실패했습니다.')
    }
}
