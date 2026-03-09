import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: Request) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        // Note: For API routes, usually we rely on middleware or service role for admin tasks.
        // Since this is a test/cleanup tool, we'll use the service role client.

        console.log('Admin triggered bulk delete via API...')

        // Delete materials first due to foreign key constraints
        // Using service role to bypass RLS and delete all
        const { error: materialError } = await supabase
            .from('materials')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (materialError) throw materialError

        // Then delete classes
        const { error: classError } = await supabase
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
