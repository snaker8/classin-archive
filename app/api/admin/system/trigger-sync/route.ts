import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

function isMonitorAlive(heartbeat: any): boolean {
    try {
        const hb = typeof heartbeat === 'string' ? JSON.parse(heartbeat) : heartbeat
        const lastTime = new Date(hb.timestamp).getTime()
        return (Date.now() - lastTime) < 90 * 1000 // 90초 이내면 활성
    } catch {
        return false
    }
}

function startFolderMonitor(): { started: boolean; error?: string } {
    try {
        // 프로젝트 루트 기준으로 dist-monitor 경로 찾기
        const projectRoot = process.cwd()
        const monitorScript = path.join(projectRoot, 'dist-monitor', 'folder-monitor.js')

        if (!fs.existsSync(monitorScript)) {
            return { started: false, error: `모니터 스크립트를 찾을 수 없습니다: ${monitorScript}` }
        }

        const child = spawn('node', [monitorScript], {
            cwd: path.join(projectRoot, 'dist-monitor'),
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        })
        child.unref()

        return { started: true }
    } catch (err: any) {
        return { started: false, error: err.message }
    }
}

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

        // 폴더 모니터가 꺼져 있으면 자동 시작
        let monitorStarted = false
        const { data: heartbeatData } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'monitor_heartbeat')
            .single()

        if (!heartbeatData || !isMonitorAlive(heartbeatData.value)) {
            const result = startFolderMonitor()
            monitorStarted = result.started
            if (!result.started) {
                console.warn('폴더 모니터 자동 시작 실패:', result.error)
            }
        }

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
                requestId: existing[0].id,
                monitorStarted
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
            message: monitorStarted
                ? '폴더 모니터를 시작하고 동기화 요청을 등록했습니다. 잠시 후 자동으로 시작됩니다.'
                : '동기화 요청이 등록되었습니다.',
            requestId: data.id,
            monitorStarted
        })
    } catch (error: any) {
        console.error('Trigger sync error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
