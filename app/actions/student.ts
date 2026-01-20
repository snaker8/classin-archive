'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createStudent(prevState: any, formData: FormData) {
    const phoneNumber = formData.get('phoneNumber') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    if (!phoneNumber || !password || !fullName) {
        return { error: '모든 필드를 입력해주세요.' }
    }

    // Convert phone number to email format for Supabase Auth
    const cleanPhone = phoneNumber.replace(/[-\s]/g, '')
    const email = `${cleanPhone}@student.local`

    try {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm email
            user_metadata: {
                full_name: fullName,
                phone_number: phoneNumber
            }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('사용자 생성 실패')

        // 2. Create profile in public.profiles table
        // Note: Trigger might handle this, but explicit insert ensures role is set correctly
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role: 'student'
            })

        if (profileError) throw profileError

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Create student error:', error)

        return { error: error.message || '학생 추가 중 오류가 발생했습니다.' }
    }
}

export async function deleteStudent(studentId: string) {
    try {
        // 1. Delete authentication user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId)
        if (authError) throw authError

        // 2. Profile will be cascade deleted or we can explicitly delete to be sure
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', studentId)

        if (profileError) throw profileError

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Delete student error:', error)

        return { error: error.message || '학생 삭제 중 오류가 발생했습니다.' }
    }
}

export async function updateStudent(studentId: string, data: { fullName?: string; password?: string }) {
    try {
        // 1. Update Auth User (Password) if provided
        if (data.password) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(studentId, {
                password: data.password
            })
            if (authError) throw authError
        }

        // 2. Update Profile (Full Name) if provided
        if (data.fullName) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ full_name: data.fullName })
                .eq('id', studentId)

            if (profileError) throw profileError

            // Also update metadata in auth to keep in sync
            await supabaseAdmin.auth.admin.updateUserById(studentId, {
                user_metadata: { full_name: data.fullName }
            })
        }

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Update student error:', error)
        return { error: error.message || '학생 정보 수정 중 오류가 발생했습니다.' }
    }
}

export async function deleteStudents(studentIds: string[]) {
    try {
        // Process in batches to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < studentIds.length; i += batchSize) {
            const batch = studentIds.slice(i, i + batchSize);
            // Delete users from Auth (this usually cascades to profiles, but we'll double check)
            await Promise.all(batch.map(id => supabaseAdmin.auth.admin.deleteUser(id)));
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Explicitly delete from profiles to be sure (and for return status)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .in('id', studentIds)

        if (profileError) {
            console.error('Profile delete error (might be already deleted by cascade):', profileError)
            // We don't throw here strictly if cascade worked, but for safety in this specific issue report context
        }

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Bulk delete students error:', error)
        return { error: error.message || '일괄 삭제 중 오류가 발생했습니다.' }
    }
}

export async function getStudents() {
    try {
        const { data: students, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .order('full_name') // Order by name for easier searching

        if (error) throw error
        return { students: students || [] }
    } catch (error) {
        console.error('Error fetching students:', error)
        return { students: [] }
    }
}

export async function getStudentDetails(studentId: string) {
    try {
        // 1. Fetch Profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', studentId)
            .single()

        if (profileError) throw profileError

        // 2. Fetch Classes with Material counts
        // we can join materials to get counts
        const { data: classes, error: classesError } = await supabaseAdmin
            .from('classes')
            .select(`
                *,
                materials:materials(*)
            `)
            .eq('student_id', studentId)
            .order('class_date', { ascending: false })

        if (classesError) throw classesError

        // 3. Fetch Enrolled Groups
        const { data: groupMembers, error: groupsError } = await supabaseAdmin
            .from('group_members')
            .select(`
                group:groups(*)
            `)
            .eq('student_id', studentId)

        if (groupsError) throw groupsError

        const enrolledGroups = groupMembers?.map((gm: any) => gm.group) || []

        return {
            student: profile,
            classes: classes || [],
            enrolledGroups
        }
    } catch (error: any) {
        console.error('Error fetching student details:', error)
        return { error: '학생 정보를 불러오는데 실패했습니다.' }
    }
}
