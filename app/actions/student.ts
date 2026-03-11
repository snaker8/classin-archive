'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireCenterAccess } from '@/lib/supabase/server'

export async function createStudent(prevState: any, formData: FormData) {
    const phoneNumber = formData.get('phoneNumber') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const grade = formData.get('grade') as string || ''
    const school = formData.get('school') as string || ''
    const parentPhone = formData.get('parentPhone') as string || ''

    if (!phoneNumber || !password || !fullName) {
        return { error: '모든 필드를 입력해주세요.' }
    }

    // Convert phone number to email format for Supabase Auth
    const cleanPhone = phoneNumber.replace(/[-\s]/g, '')
    const email = `${cleanPhone}@student.local`

    try {
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        const requesterProfile = await requireCenterAccess(activeCenter)

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
        const profileData: any = {
            id: authData.user.id,
            email,
            full_name: fullName,
            role: 'student',
            ...(grade ? { grade } : {}),
            ...(school ? { school } : {}),
            ...(parentPhone ? { parent_phone: parentPhone.replace(/[-\s]/g, '') } : {})
        }

        if (requesterProfile.role !== 'super_manager' && !(requesterProfile.role === 'admin' && requesterProfile.center === '전체')) {
            profileData.center = requesterProfile.center
        } else if (activeCenter && activeCenter !== '전체') {
            profileData.center = activeCenter
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData)

        if (profileError) throw profileError

        // Create parent account if parent phone provided
        if (parentPhone) {
            await ensureParentAccount(parentPhone.replace(/[-\s]/g, ''), profileData.center)
        }

        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/students')
        return { success: true }
    } catch (error: any) {
        console.error('Create student error:', error)

        return { error: error.message || '학생 추가 중 오류가 발생했습니다.' }
    }
}

export async function deleteStudent(studentId: string) {
    try {
        // Security check: ensure user has access to this student's center
        const { data: student } = await supabaseAdmin
            .from('profiles')
            .select('center')
            .eq('id', studentId)
            .single()

        if (student) {
            await requireCenterAccess(student.center)
        }

        // 1. Delete authentication user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId)
        if (authError) throw authError

        // 2. Profile will be cascade deleted
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

export async function updateStudent(studentId: string, data: { fullName?: string; password?: string; center?: string; hall?: string; grade?: string; school?: string; parentPhone?: string }) {
    try {
        // Security check: ensure user has access to this student's center
        const { data: student } = await supabaseAdmin
            .from('profiles')
            .select('center')
            .eq('id', studentId)
            .single()

        if (student) {
            await requireCenterAccess(student.center)
        }

        // 1. Update Auth User (Password) if provided
        if (data.password) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(studentId, {
                password: data.password
            })
            if (authError) throw authError
        }

        // 2. Update Profile
        const updateData: any = {}
        if (data.fullName) updateData.full_name = data.fullName
        if (data.center !== undefined) updateData.center = data.center
        if (data.hall !== undefined) updateData.hall = data.hall
        if (data.grade !== undefined) updateData.grade = data.grade
        if (data.school !== undefined) updateData.school = data.school
        if (data.parentPhone !== undefined) updateData.parent_phone = data.parentPhone.replace(/[-\s]/g, '')

        if (Object.keys(updateData).length > 0) {
            // Also check access if they are moving student to a NEW center
            if (data.center) {
                await requireCenterAccess(data.center)
            }

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', studentId)

            if (profileError) throw profileError

            // Create parent account if parent phone provided/changed
            if (data.parentPhone) {
                await ensureParentAccount(data.parentPhone.replace(/[-\s]/g, ''), data.center || student?.center)
            }

            // Also update metadata in auth to keep in sync if name changed
            if (data.fullName) {
                await supabaseAdmin.auth.admin.updateUserById(studentId, {
                    user_metadata: { full_name: data.fullName }
                })
            }
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
        const cookieStore = cookies()
        const activeCenter = cookieStore.get('active_center')?.value

        const requesterProfile = await requireCenterAccess(activeCenter)

        let query = supabaseAdmin
            .from('profiles')
            .select(`
                *,
                group_members (
                    group:groups (
                        id,
                        name
                    )
                )
            `)
            .eq('role', 'student')

        // If not super_manager/전체-admin, force filter by their center
        if (requesterProfile.role !== 'super_manager' && !(requesterProfile.role === 'admin' && requesterProfile.center === '전체')) {
            query = query.eq('center', requesterProfile.center)
        } else if (activeCenter && activeCenter !== '전체') {
            query = query.eq('center', activeCenter)
        }

        const { data: students, error } = await query.order('full_name') // Order by name for easier searching

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
        if (!profile) throw new Error('학생 정보를 찾을 수 없습니다.')

        // Security Check: Ensure requester has access to this student's center
        await requireCenterAccess(profile.center)

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
        // Natural sort enrolled groups
        enrolledGroups.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }))

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

// ===== Parent Account Helpers =====

async function ensureParentAccount(cleanPhone: string, center?: string) {
    if (!cleanPhone) return
    const email = `${cleanPhone}@parent.local`

    try {
        // Check if parent auth user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 })
        // listUsers doesn't support email filter well, so check via profiles
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (existingProfile) return // Already exists

        // Create auth user for parent
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPhone, // Default password = phone number
            email_confirm: true,
            user_metadata: { full_name: '학부모', phone_number: cleanPhone }
        })

        if (authError) {
            // If user already exists in auth but not in profiles, just log it
            if (authError.message?.includes('already been registered')) return
            throw authError
        }

        if (authData.user) {
            await supabaseAdmin.from('profiles').upsert({
                id: authData.user.id,
                email,
                full_name: '학부모',
                role: 'parent',
                ...(center ? { center } : {})
            })
        }
    } catch (error) {
        console.error('Error creating parent account:', error)
        // Don't throw - parent account creation failure shouldn't block student creation
    }
}

export async function getParentChildren() {
    try {
        const cookieStore = cookies()
        const token = cookieStore.get('sb-access-token')?.value
        if (!token) return { children: [] }

        const { data: { user } } = await supabaseAdmin.auth.getUser(token)
        if (!user) return { children: [] }

        // Get parent's phone from email
        const parentEmail = user.email || ''
        if (!parentEmail.endsWith('@parent.local')) return { children: [] }
        const parentPhone = parentEmail.replace('@parent.local', '')

        // Find all students with this parent_phone
        const { data: children, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, grade, school, center, hall')
            .eq('parent_phone', parentPhone)
            .eq('role', 'student')
            .order('full_name')

        if (error) throw error
        return { children: children || [] }
    } catch (error: any) {
        console.error('Error fetching parent children:', error)
        return { children: [] }
    }
}
