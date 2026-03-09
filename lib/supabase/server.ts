import { cookies } from 'next/headers'
import { supabaseAdmin } from './admin'
import { Profile } from './client'

export async function getServerSession() {
    const cookieStore = cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) return null

    // Use the admin client to verify the token and get the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) return null

    return user
}

export async function getServerProfile(): Promise<Profile | null> {
    const user = await getServerSession()
    if (!user) return null

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error || !profile) return null

    return profile as Profile
}

export async function requireRole(allowedRoles: string[]) {
    const profile = await getServerProfile()
    if (!profile || !allowedRoles.includes(profile.role)) {
        throw new Error('권한이 없습니다.')
    }
    return profile
}
export async function requireCenterAccess(targetCenter?: string) {
    const profile = await getServerProfile()
    if (!profile) throw new Error('인증이 필요합니다.')

    // super_manager and admin with '전체' center have full access
    if (profile.role === 'super_manager' || (profile.role === 'admin' && profile.center === '전체')) {
        return profile
    }

    // If no target center is provided, we just return the profile (it has a center)
    if (!targetCenter) return profile

    // Check if user's center matches the target center
    if (profile.center !== targetCenter) {
        throw new Error('해당 센터의 데이터에 접근할 권한이 없습니다.')
    }

    return profile
}
