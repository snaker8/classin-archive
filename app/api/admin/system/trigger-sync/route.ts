import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    const auth = await verifyApiAuth(['admin', 'super_manager', 'manager'])
    if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        const body = await request.json().catch(() => ({}))
        const targetCenter = body.center || '전체'

        // 10분 이상 된 오래된 pending/running 요청 자동 정리
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        await supabase
            .from('sync_requests')
            .update({ status: 'done', completed_at: new Date().toISOString(), log_message: '응답 없음 (자동 만료)' })
            .in('status', ['pending', 'running'])
            .lt('requested_at', tenMinAgo)

        // 이미 최근 pending 중인 요청이 있는지 확인
        const { data: existing } = await supabase
            .from('sync_requests')
            .select('id, requested_at')
            .eq('status', 'pending')
            .eq('center', targetCenter)
            .limit(1)

        if (existing && existing.length > 0) {
            return NextResponse.json({
                success: true,
                message: '이미 동기화 요청이 대기 중입니다.',
                pending: true,
                requestId: existing[0].id
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
