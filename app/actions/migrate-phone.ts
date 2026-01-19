'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function migrateToPhoneLogin(fullName: string, phoneNumber: string, password: string) {
    const cleanPhone = phoneNumber.replace(/[-\s]/g, '')
    const newEmail = `${cleanPhone}@student.local`

    try {
        // 1. Find user by name
        const { data: profiles, error: findError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('full_name', fullName)
            .eq('role', 'student')

        if (findError) throw findError

        if (!profiles || profiles.length === 0) {
            return { error: '해당 이름의 학생을 찾을 수 없습니다.' }
        }

        if (profiles.length > 1) {
            return { error: '동일한 이름의 학생이 여러 명 있습니다. 관리자에게 문의하세요.' }
        }

        const profile = profiles[0]

        // 2. Verify password by trying to sign in
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: profile.email,
            password: password
        })

        if (signInError) {
            return { error: '비밀번호가 올바르지 않습니다.' }
        }

        // 3. Check if new email already exists
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', newEmail)
            .single()

        if (existingUser && existingUser.id !== profile.id) {
            return { error: '이미 해당 전화번호로 등록된 계정이 있습니다.' }
        }

        // 4. Update email in Supabase Auth
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            profile.id,
            { email: newEmail, email_confirm: true }
        )

        if (updateAuthError) throw updateAuthError

        // 5. Update email in profiles table
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ email: newEmail })
            .eq('id', profile.id)

        if (updateProfileError) throw updateProfileError

        return {
            success: true,
            message: `로그인 ID가 전화번호(${phoneNumber})로 변경되었습니다. 이제 전화번호로 로그인하세요.`
        }
    } catch (error: any) {
        console.error('Migration error:', error)
        return { error: error.message || '전환 중 오류가 발생했습니다.' }
    }
}
