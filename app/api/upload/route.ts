import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// New App Router route segment config (replaces deprecated export const config)
export const maxDuration = 300; // 5 minutes max for large video uploads

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const batchId = formData.get('batchId') as string;
        const classId = formData.get('classId') as string;

        if (!file || !batchId || !classId) {
            return NextResponse.json({ error: 'Missing file, batchId, or classId' }, { status: 400 });
        }

        console.log(`[Local Upload] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Define upload directory
        const uploadDir = path.join(process.cwd(), 'manual-uploads', classId, batchId);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Use original filename or safe name
        const filePath = path.join(uploadDir, file.name);

        // Stream the file to disk to minimize memory usage
        const writeStream = fs.createWriteStream(filePath);
        const readableStream = Readable.fromWeb(file.stream() as any);

        await pipeline(readableStream, writeStream);

        console.log(`[Local Upload] Successfully saved: ${filePath}`);

        return NextResponse.json({
            success: true,
            path: filePath,
            // Return the 'local:' path format expected by main.py
            localPath: `local:${filePath}`
        });

    } catch (error: any) {
        console.error('[Local Upload] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
