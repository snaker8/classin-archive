import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route용 인증 헬퍼
 * 쿠키의 access token으로 사용자를 확인하고 역할을 검증합니다.
 */
export async function verifyApiAuth(allowedRoles: string[] = ['admin', 'super_manager']) {
    const cookieStore = cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
        return { authorized: false, error: '인증이 필요합니다.' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return { authorized: false, error: '서버 설정 오류' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
        return { authorized: false, error: '유효하지 않은 세션입니다.' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, center')
        .eq('id', user.id)
        .single()

    if (!profile || !allowedRoles.includes(profile.role)) {
        return { authorized: false, error: '권한이 없습니다.' }
    }

    return { authorized: true, user, profile, supabase }
}
