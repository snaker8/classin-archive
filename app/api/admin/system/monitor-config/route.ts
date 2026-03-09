import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars')
    return createClient(url, key)
}

const DEFAULT_CONFIG = {
    watchDirs: [],
    autoUploadImages: false,
    autoUploadVideos: true
}

export async function GET() {
    const auth = await verifyApiAuth(['admin', 'super_manager', 'manager'])
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    try {
        const supabase = getAdmin()
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'monitor_config')
            .single()

        if (error || !data) {
            return NextResponse.json(DEFAULT_CONFIG)
        }

        const config = data.value as any

        // Convert old string array to object array if necessary
        if (config.watchDirs && config.watchDirs.length > 0 && typeof config.watchDirs[0] === 'string') {
            config.watchDirs = config.watchDirs.map((dir: string) => ({
                center: '기본 센터',
                path: dir
            }))
        }

        return NextResponse.json(config)
    } catch (error: any) {
        console.error('Error reading monitor config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const auth = await verifyApiAuth(['super_manager'])
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    try {
        const newConfig = await request.json()

        // Validate structure
        if (!newConfig || !Array.isArray(newConfig.watchDirs)) {
            return NextResponse.json({ error: 'Invalid config format' }, { status: 400 })
        }

        const supabase = getAdmin()
        const { error } = await supabase
            .from('system_config')
            .upsert({
                key: 'monitor_config',
                value: newConfig,
                updated_at: new Date().toISOString()
            })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Configuration saved successfully' })
    } catch (error: any) {
        console.error('Error saving monitor config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
