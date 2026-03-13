import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const auth = await verifyApiAuth(['admin', 'super_manager', 'manager'])
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        const { searchParams } = new URL(request.url)
        const requestId = searchParams.get('id')
        const center = searchParams.get('center') || '전체'

        let query = supabase
            .from('sync_requests')
            .select('id, status, center, requested_at, started_at, completed_at, files_found, files_processed, log_message, error_message')
            .order('requested_at', { ascending: false })
            .limit(1)

        if (requestId) {
            query = query.eq('id', requestId)
        } else {
            query = query.eq('center', center)
        }

        const { data, error } = await query.single()

        if (error) {
            return NextResponse.json({ status: 'none', message: '동기화 기록이 없습니다.' })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
