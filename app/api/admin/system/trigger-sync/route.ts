import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        const body = await request.json().catch(() => ({}))
        const targetCenter = body.center || '전체'

        // 이미 pending 중인 요청이 있는지 확인
        const { data: existing } = await supabase
            .from('sync_requests')
            .select('id, requested_at')
            .eq('status', 'pending')
            .eq('center', targetCenter)
            .limit(1)

        if (existing && existing.length > 0) {
            return NextResponse.json({
                success: true,
                message: '이미 동기화 요청이 대기 중입니다. 로컬 PC가 연결되면 곧 실행됩니다.',
                pending: true
            })
        }

        // 새 동기화 요청 기록
        const { data, error } = await supabase
            .from('sync_requests')
            .insert({
                status: 'pending',
                center: targetCenter,
                requested_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (error) throw error

        console.log(`[SYNC REQUEST] Created request ${data.id} for center: ${targetCenter}`)

        return NextResponse.json({
            success: true,
            message: '동기화 요청이 등록되었습니다. 로컬 PC의 모니터 프로그램이 실행 중이면 약 30초 내에 자동으로 동기화가 시작됩니다.',
            requestId: data.id
        })
    } catch (error: any) {
        console.error('Trigger sync error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
