import { NextResponse } from 'next/server'
import { verifyApiAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
    const auth = await verifyApiAuth(['admin', 'super_manager'])
    if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error }, { status: 403 })
    }

    try {
        const { supabase } = auth

        const { data: classes, error: fetchError } = await supabase!
            .from('classes')
            .select('id, title')

        if (fetchError) throw fetchError

        let updatedCount = 0
        const classroomRegex = /\b\d{3}\b\s*/g

        for (const cls of classes || []) {
            const newTitle = cls.title.replace(classroomRegex, "").trim()

            if (newTitle !== cls.title) {
                const { error: updateError } = await supabase!
                    .from('classes')
                    .update({ title: newTitle })
                    .eq('id', cls.id)

                if (!updateError) {
                    updatedCount++
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `${updatedCount}개의 수업 제목이 수정되었습니다.`,
            updatedCount
        })
    } catch (error: any) {
        console.error('Title cleanup error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
