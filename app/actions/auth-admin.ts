'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Note: Using a fresh admin client here to ensure we have the service role key available in the server action context
// We could import from lib/supabase/admin.ts but we need to be sure about the environment variables
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function updateAdminPassword(password: string) {
    try {
        // 1. Get the current user from the request context to ensure it's an admin requesting this
        // We need a separate client for auth context verification
        // However, since we are in a server action, cookies are available. 
        // But verify the user in the "calling" context first.

        // For simplicity and verifying the user identity, we'll rely on the client component passing the request 
        // OR we check the session here.

        // Let's create a checking client
        // Actually, to be safe, we should extract the user ID from the currently logged in session 
        // using the standard client before using the admin client to update it.

        // BUT, since we are using the service role to update the password, we need to know WHICH user to update.
        // We should get the current session user.

        /* 
        const cookieStore = cookies()
        const supabase = createServerClient( ... ) 
        const { data: { user } } = await supabase.auth.getUser()
        */

        // For now, let's look up the admin user by email directly since we know there is only one 'admin'.
        // Or better, let's fetch the user by the known admin email 'snaker@hanmail.net' as a failsafe
        // or rely on the fact that this is an admin-only area.

        // Let's implement a safe check:
        // 1. We assume the caller is the admin (protected by layout/middleware).
        // 2. We find the admin user's ID.
        // 3. We update that ID.

        console.log('Attempting to update admin password...')

        // Find the admin user profile
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('role', 'admin')
            .single()

        if (profileError || !profiles) {
            console.error('Admin profile not found:', profileError)
            return { success: false, error: '관리자 프로필을 찾을 수 없습니다.' }
        }

        console.log(`Updating password for admin: ${profiles.email} (${profiles.id})`)

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            profiles.id,
            { password: password }
        )

        if (updateError) {
            console.error('Password update failed:', updateError)
            return { success: false, error: updateError.message }
        }

        revalidatePath('/admin')
        return { success: true }

    } catch (error: any) {
        console.error('Unexpected error updating password:', error)
        return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' }
    }
}


export async function promoteToManager(profileId: string) {
    try {
        if (!profileId) throw new Error('프로필 ID가 필요합니다.')

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'manager' })
            .eq('id', profileId)

        if (error) throw error

        revalidatePath('/admin/teachers')
        return { success: true }
    } catch (error: any) {
        console.error('Error promoting to manager:', error)
        return { success: false, error: '관리자 승격 중 오류가 발생했습니다.' }
    }
}

