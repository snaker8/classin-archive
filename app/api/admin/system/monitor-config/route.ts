import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const CONFIG_FILE = path.join(process.cwd(), 'scripts', 'monitor-config.json')

export async function GET() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            // Return default structure if it doesn't exist
            return NextResponse.json({
                watchDirs: [],
                autoUploadImages: false,
                autoUploadVideos: true
            })
        }

        const configRaw = fs.readFileSync(CONFIG_FILE, 'utf8')
        const config = JSON.parse(configRaw)

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
    try {
        const newConfig = await request.json()

        // Validate structure (basic validation)
        if (!newConfig || !Array.isArray(newConfig.watchDirs)) {
            return NextResponse.json({ error: 'Invalid config format' }, { status: 400 })
        }

        // Save to file
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2))

        return NextResponse.json({ success: true, message: 'Configuration saved successfully' })
    } catch (error: any) {
        console.error('Error saving monitor config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
