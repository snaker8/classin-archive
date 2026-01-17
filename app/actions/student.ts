'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createStudent(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    if (!email || !password || !fullName) {
        return { error: '모든 필드를 입력해주세요.' }
    }

    try {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm email
            user_metadata: {
                full_name: fullName
            }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('사용자 생성 실패')

        // 2. Create profile in public.profiles table
        // Note: Trigger might handle this, but explicit insert ensures role is set correctly
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role: 'student'
            })

        if (profileError) throw profileError

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Create student error:', error)
        return { error: error.message || '학생 추가 중 오류가 발생했습니다.' }
    }
}
