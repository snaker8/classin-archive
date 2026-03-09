import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
    if (_supabaseAdmin) return _supabaseAdmin

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    return _supabaseAdmin
}

// Note: This client has admin privileges. Use with caution.
// Lazy-initialized to avoid build-time errors when env vars are not available.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabaseAdmin() as any)[prop]
    }
})
