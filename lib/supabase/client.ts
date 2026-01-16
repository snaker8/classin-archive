import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 타입 정의
export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'student' | 'admin'
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  student_id: string
  title: string
  description: string | null
  class_date: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  class_id: string
  type: 'blackboard_image' | 'video_link'
  content_url: string
  title: string | null
  order_index: number
  created_at: string
  updated_at: string
}

// Helper 함수들
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data as Profile
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function isAdmin() {
  try {
    const profile = await getCurrentProfile()
    return profile?.role === 'admin'
  } catch {
    return false
  }
}
