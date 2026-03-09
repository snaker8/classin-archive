import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'

export async function DELETE(request: Request) {
    const auth = await verifyApiAuth(['super_manager'])
    if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error }, { status: 403 })
    }

    try {
        const { supabase } = auth

        // Delete materials first due to foreign key constraints
        const { error: materialError } = await supabase!
            .from('materials')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (materialError) throw materialError

        // Then delete classes
        const { error: classError } = await supabase!
            .from('classes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (classError) throw classError

        return NextResponse.json({ success: true, message: 'All materials and classes deleted successfully' })
    } catch (error: any) {
        console.error('Bulk delete error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
