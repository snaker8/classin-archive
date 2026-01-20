'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentProfile, signOut } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { BookOpen, LogOut, Settings, Users, User } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // 10초 타임아웃 설정
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 10000)
      })

      try {
        await Promise.race([
          (async () => {
            const profile = await getCurrentProfile()

            if (!profile) {
              console.log('No profile found, redirecting to login')
              router.push('/login')
              return
            }

            if (profile.role !== 'admin') {
              console.log('Not admin, redirecting to student dashboard')
              router.push('/student/dashboard')
              return
            }

            setUserName(profile.full_name)
          })(),
          timeoutPromise
        ])
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    let mounted = true
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
              <div className="p-2 bg-primary rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">관리자 대시보드</h1>
                <p className="text-sm text-muted-foreground">{userName}님</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
                <BookOpen className="h-4 w-4 mr-2" />
                홈
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/groups')}>
                <Users className="h-4 w-4 mr-2" />
                반 관리
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/teachers')}>
                <User className="h-4 w-4 mr-2" />
                선생님 관리
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      <Toaster />
    </div>
  )
}
