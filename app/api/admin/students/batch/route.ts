import { NextRequest, NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface StudentInput {
    name: string
    phone?: string
    center?: string
    grade?: string
}

export async function POST(request: NextRequest) {
    const auth = await verifyApiAuth(['admin', 'super_manager', 'manager'])
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { students } = await request.json() as { students: StudentInput[] }
    if (!students || !Array.isArray(students) || students.length === 0) {
        return NextResponse.json({ error: '등록할 학생 목록이 없습니다.' }, { status: 400 })
    }

    // 기존 학생/선생님 이름 조회
    const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('full_name, role')

    const existingNames = new Set<string>()
    const teacherNames = new Set<string>()
    existingProfiles?.forEach(p => {
        if (p.role === 'student') existingNames.add(p.full_name)
    })

    const { data: teachers } = await supabaseAdmin
        .from('teachers')
        .select('name')
    teachers?.forEach(t => teacherNames.add(t.name))

    const results: { name: string; status: 'success' | 'error'; message: string }[] = []

    for (const student of students) {
        const name = student.name.trim()

        if (teacherNames.has(name)) {
            results.push({ name, status: 'error', message: '선생님으로 등록된 이름입니다.' })
            continue
        }
        if (existingNames.has(name)) {
            results.push({ name, status: 'error', message: '이미 등록된 학생입니다.' })
            continue
        }

        try {
            const email = `student_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@classin.com`

            // Admin API로 유저 생성 - 관리자 세션에 영향 없음
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: '123456',
                email_confirm: true,
                user_metadata: {
                    full_name: name,
                    grade: student.grade
                }
            })

            if (authError) throw authError

            if (authData.user) {
                // 센터 정보 업데이트
                const updates: Record<string, string> = {}
                if (student.center) updates.center = student.center
                if (Object.keys(updates).length > 0) {
                    await supabaseAdmin.from('profiles').update(updates).eq('id', authData.user.id)
                }

                const info = [student.grade, student.center, student.phone ? `(${student.phone.slice(-4)})` : ''].filter(Boolean).join(' / ')
                results.push({ name, status: 'success', message: `가입 완료${info ? ` (${info})` : ''}` })
                existingNames.add(name)
            }
        } catch (error: any) {
            results.push({ name, status: 'error', message: error.message || '알 수 없는 오류' })
        }
    }

    return NextResponse.json({ results })
}
