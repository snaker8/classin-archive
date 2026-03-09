import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        console.log('Admin triggered title cleanup...')

        // Fetch all classes
        const { data: classes, error: fetchError } = await supabase
            .from('classes')
            .select('id, title')

        if (fetchError) throw fetchError

        let updatedCount = 0

        // Regex to find standalone 3-digit classroom numbers and following space
        const classroomRegex = /\b\d{3}\b\s*/g

        for (const cls of classes || []) {
            const newTitle = cls.title.replace(classroomRegex, "").trim()

            if (newTitle !== cls.title) {
                const { error: updateError } = await supabase
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
