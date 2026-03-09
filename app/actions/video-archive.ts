'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getVideoArchive() {
    try {
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        let query = supabaseAdmin
            .from('video_archive')
            .select(`
                *,
                class:classes!inner(
                    title,
                    class_date,
                    student:profiles!classes_student_id_fkey!inner(full_name, center)
                )
            `)

        if (activeCenter && activeCenter !== '전체') {
            query = query.eq('class.student.center', activeCenter)
        }

        // Sort by class_date first, then created_at for within-day order
        const { data, error } = await query
            .order('class(class_date)', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error
        return { data }
    } catch (error: any) {
        console.error('Error fetching video archive:', error)
        return { error: error.message }
    }
}

export async function deleteArchiveRecord(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('video_archive')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/video-archive')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting archive record:', error)
        return { error: error.message }
    }
}

export async function retryVideoProcessing(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('video_archive')
            .update({
                status: 'processing',
                error_log: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/video-archive')
        return { success: true }
    } catch (error: any) {
        console.error('Error retrying video processing:', error)
        return { error: error.message }
    }
}
export async function addVideoToArchive(
    classId: string,
    title: string,
    filePath: string,
    batchId?: string,
    partNumber?: number,
    totalParts?: number
) {
    try {
        const { data, error } = await supabaseAdmin
            .from('video_archive')
            .insert({
                class_id: classId,
                title: title,
                file_path: filePath,
                status: 'processing',
                batch_id: batchId,
                part_number: partNumber,
                total_parts: totalParts
            })
            .select()
            .single()

        if (error) throw error
        revalidatePath('/admin/video-archive')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error adding video to archive:', error)
        return { error: error.message }
    }
}

export async function uploadVideoToStorage(formData: FormData) {
    try {
        const file = formData.get('file') as File
        const path = formData.get('path') as string

        if (!file || !path) throw new Error('File or path missing')

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await supabaseAdmin
            .storage
            .from('raw-videos')
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) throw error
        return { success: true, path: data.path }
    } catch (error: any) {
        console.error('Error uploading video to storage:', error)
        return { error: error.message }
    }
}

export async function getSignedUploadUrl(path: string) {
    try {
        const { data, error } = await supabaseAdmin
            .storage
            .from('raw-videos')
            .createSignedUploadUrl(path)

        if (error) {
            console.error('[getSignedUploadUrl] Supabase Error:', error);
            throw error
        }
        return { success: true, url: data.signedUrl, token: data.token, path: path }
    } catch (error: any) {
        console.error('Error getting signed upload URL:', error)
        return { error: error.message }
    }
}

export async function registerManualVideoBatch(
    classId: string,
    batchId: string,
    files: { path: string; name: string }[]
) {
    try {
        if (!files || files.length === 0) return { error: 'No files provided' }

        const totalParts = files.length
        const records = files.map((file, index) => ({
            class_id: classId,
            title: file.name,
            file_path: file.path,
            part_number: index + 1,
            total_parts: totalParts,
            batch_id: batchId,
            status: 'processing',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            device_id: process.env.DEVICE_ID || 'unknown'
        }))

        const { data, error } = await supabaseAdmin
            .from('video_archive')
            .insert(records)
            .select()

        if (error) throw error
        return { success: true, count: data.length }
    } catch (error: any) {
        console.error('Error registering batch:', error)
        return { error: error.message }
    }
}
