'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type CenterType = 'center' | 'hall'

export interface Center {
    id: string
    name: string
    type: CenterType
    created_at: string
}

export async function getCenters() {
    try {
        const { data: centers, error } = await supabaseAdmin
            .from('centers')
            .select('*')
            .order('name')

        if (error) throw error

        return { centers: centers as Center[] }
    } catch (error) {
        console.error('Error fetching centers:', error)
        return { centers: [] }
    }
}

export async function createCenter(name: string, type: CenterType) {
    try {
        const { data, error } = await supabaseAdmin
            .from('centers')
            .insert([{ name, type }])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/centers')
        revalidatePath('/login') // Refresh login page to show new centers
        return { success: true, center: data }
    } catch (error: any) {
        console.error('Create center error:', error)
        return { error: error.message || '센터/관 생성 중 오류가 발생했습니다.' }
    }
}

export async function deleteCenter(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('centers')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/centers')
        revalidatePath('/login')
        return { success: true }
    } catch (error: any) {
        console.error('Delete center error:', error)
        return { error: error.message || '삭제 중 오류가 발생했습니다.' }
    }
}
