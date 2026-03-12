import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireRole } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 300;

// Token verification cache to avoid hitting Supabase rate limits on chunk uploads
const tokenCache = new Map<string, { authorized: boolean, expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        let isAuthorized = false;
        const authHeader = req.headers.get('Authorization') || req.cookies.get('sb-access-token')?.value;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        if (token) {
            const now = Date.now();
            const cached = tokenCache.get(token);

            if (cached && cached.expiry > now) {
                isAuthorized = cached.authorized;
            } else {
                try {
                    // requireRole checks cookies by default, but we might be using fallback header
                    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                    if (user && !error) {
                        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
                        if (profile && ['admin', 'manager', 'super_manager', 'teacher'].includes(profile.role)) {
                            isAuthorized = true;
                        }
                    }

                    // Cache the result
                    tokenCache.set(token, { authorized: isAuthorized, expiry: now + CACHE_TTL_MS });
                } catch (e) {
                    console.error('[Upload Auth] Cache miss validation failed:', e);
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
        }

        const formData = await req.formData();
        const chunk = formData.get('chunk') as File;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string);
        const totalChunks = parseInt(formData.get('totalChunks') as string);
        const filename = formData.get('filename') as string;
        const batchId = formData.get('batchId') as string;
        const classId = formData.get('classId') as string;

        if (!chunk || isNaN(chunkIndex) || !filename || !batchId || !classId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), 'manual-uploads', classId, batchId);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        const bytes = await chunk.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Standard chunk size used by client (e.g. 5MB)
        const chunkSize = parseInt(formData.get('chunkSize') as string) || buffer.length;

        // Use synchronous file descriptor for precise offset writing
        const fd = fs.openSync(filePath, 'a+');
        try {
            const position = chunkIndex * chunkSize;
            fs.writeSync(fd, buffer, 0, buffer.length, position);
        } finally {
            fs.closeSync(fd);
        }

        const isComplete = chunkIndex === totalChunks - 1;
        const localOnly = formData.get('localOnly') === 'true';
        let finalPath = filePath;

        if (isComplete) {
            const fileSize = fs.statSync(filePath).size;
            const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
            console.log(`[Chunk Upload] Completed: ${filename} (${fileSizeMB}MB) for batch ${batchId}.`);

            if (!localOnly) {
                // Sanitize filename for Supabase Storage (no Korean, spaces, brackets)
                const safeFilename = filename
                    .replace(/[^\w.\-]/g, '_')
                    .replace(/_+/g, '_');
                const storagePath = `manual/${classId}/${batchId}/${safeFilename}`;

                try {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                    if (!supabaseUrl || !serviceKey) {
                        throw new Error('Missing Supabase environment variables');
                    }

                    const fileStream = fs.createReadStream(filePath);
                    const uploadUrl = `${supabaseUrl}/storage/v1/object/raw-videos/${storagePath}`;

                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceKey}`,
                            'Content-Type': 'video/mp4',
                            'Content-Length': String(fileSize),
                            'x-upsert': 'true',
                        },
                        body: fileStream as any,
                        // @ts-ignore - duplex required for streaming body in Node 18+
                        duplex: 'half',
                    });

                    if (!response.ok) {
                        const errBody = await response.text();
                        throw new Error(`Storage upload failed (${response.status}): ${errBody}`);
                    }

                    console.log(`[Chunk Upload] Uploaded to Supabase: ${storagePath} (${fileSizeMB}MB)`);
                    fs.unlinkSync(filePath);
                    try {
                        const dir = path.dirname(filePath);
                        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
                    } catch (e) { }

                    finalPath = storagePath;
                } catch (err: any) {
                    console.error('[Chunk Upload] Supabase upload failed:', err);
                    return NextResponse.json({ error: 'Cloud storage 업로드 실패: ' + err.message }, { status: 500 });
                }
            } else {
                console.log(`[Chunk Upload] Local-only mode. File saved: ${filePath} (${fileSizeMB}MB)`);
                finalPath = `local:${filePath}`;
            }
        }

        return NextResponse.json({
            success: true,
            isComplete,
            chunkIndex,
            totalChunks,
            path: finalPath,
            localPath: isComplete ? finalPath : undefined
        });

    } catch (error: any) {
        console.error('[Chunk Upload] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
