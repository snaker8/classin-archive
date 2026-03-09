
import { writeFile, mkdir } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File
        const originalName = data.get('filename') as string || 'unknown'

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), '_local_uploads')
        await mkdir(uploadDir, { recursive: true })

        // Generate unique filename
        const fileExt = originalName.split('.').pop()
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = path.join(uploadDir, safeFileName)

        // Write file
        await writeFile(filePath, buffer)

        console.log(`File saved locally to ${filePath}`)

        return NextResponse.json({
            success: true,
            filePath: filePath,
            localPath: `local:${filePath}` // Prefix to identify local file in DB
        })

    } catch (error: any) {
        console.error('Local upload failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
