'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Create a new note
export async function createNote(classId: string, title: string, content: string, authorId: string) {
    try {
        if (!authorId) {
            return { error: '로그인이 필요합니다.' }
        }

        if (!classId || !content.trim()) {
            return { error: '내용을 입력해주세요.' }
        }

        const { data, error } = await supabaseAdmin
            .from('notes')
            .insert({
                class_id: classId,
                author_id: authorId,
                title: title.trim() || '제목 없음',
                content: content.trim()
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/students')
        revalidatePath('/student/viewer')
        return { success: true, note: data }
    } catch (error: any) {
        console.error('Create note error:', error)
        return { error: error.message || '노트 생성 중 오류가 발생했습니다.' }
    }
}

// Get notes by class ID
export async function getNotesByClass(classId: string) {
    try {
        if (!classId) {
            return { notes: [] }
        }

        const { data, error } = await supabaseAdmin
            .from('notes')
            .select(`
                *,
                author:profiles!notes_author_id_fkey(full_name, role)
            `)
            .eq('class_id', classId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { notes: data || [] }
    } catch (error: any) {
        console.error('Get notes error:', error)
        return { notes: [], error: error.message }
    }
}

// Get note by ID
export async function getNoteById(noteId: string) {
    try {
        if (!noteId) {
            return { error: '노트 ID가 필요합니다.' }
        }

        const { data, error } = await supabaseAdmin
            .from('notes')
            .select(`
                *,
                author:profiles!notes_author_id_fkey(full_name, role)
            `)
            .eq('id', noteId)
            .single()

        if (error) throw error

        return { note: data }
    } catch (error: any) {
        console.error('Get note error:', error)
        return { error: error.message }
    }
}

// Update note
export async function updateNote(noteId: string, title: string, content: string, userId?: string) {
    try {
        if (!noteId || !content.trim()) {
            return { error: '내용을 입력해주세요.' }
        }

        // Get existing note to check ownership
        const { data: existingNote } = await supabaseAdmin
            .from('notes')
            .select('author_id')
            .eq('id', noteId)
            .single()

        if (!existingNote) {
            return { error: '노트를 찾을 수 없습니다.' }
        }

        // Check if user provided and has permission
        if (userId) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            const isAdmin = ['admin', 'manager', 'super_manager'].includes(profile?.role || '')

            if (existingNote.author_id !== userId && !isAdmin) {
                return { error: '본인의 노트만 수정할 수 있습니다.' }
            }
        }

        const { data, error } = await supabaseAdmin
            .from('notes')
            .update({
                title: title.trim() || '제목 없음',
                content: content.trim()
            })
            .eq('id', noteId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/students')
        revalidatePath('/student/viewer')
        return { success: true, note: data }
    } catch (error: any) {
        console.error('Update note error:', error)
        return { error: error.message || '노트 수정 중 오류가 발생했습니다.' }
    }
}

// Delete note
export async function deleteNote(noteId: string, userId?: string) {
    try {
        if (!noteId) {
            return { error: '노트 ID가 필요합니다.' }
        }

        // Get existing note
        const { data: existingNote } = await supabaseAdmin
            .from('notes')
            .select('author_id')
            .eq('id', noteId)
            .single()

        if (!existingNote) {
            return { error: '노트를 찾을 수 없습니다.' }
        }

        // Check permission if userId provided
        if (userId) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            const isAdmin = ['admin', 'manager', 'super_manager'].includes(profile?.role || '')

            if (existingNote.author_id !== userId && !isAdmin) {
                return { error: '본인의 노트만 삭제할 수 있습니다.' }
            }
        }

        const { error } = await supabaseAdmin
            .from('notes')
            .delete()
            .eq('id', noteId)

        if (error) throw error

        revalidatePath('/admin/students')
        revalidatePath('/student/viewer')
        return { success: true }
    } catch (error: any) {
        console.error('Delete note error:', error)
        return { error: error.message || '노트 삭제 중 오류가 발생했습니다.' }
    }
}
