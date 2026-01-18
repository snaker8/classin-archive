'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentProfile, signOut } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { BookOpen, LogOut } from 'lucide-react'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await getCurrentProfile()

        if (!profile) {
          router.push('/login')
          return
        }

        if (profile.role !== 'student') {
          router.push('/admin/dashboard')
          return
        }

        setUserName(profile.full_name)
      } catch (error: any) {
        console.error('Auth error:', error)
        // router.push('/login') // Disable redirect for debugging
        alert(`Auth Error: ${error.message || 'Unknown'}`) // Temporary alert
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // if (event === 'SIGNED_OUT') {
      //   router.push('/login')
      // }
      console.log('Auth check:', event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
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
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ClassIn 학습 아카이브</h1>
                <p className="text-sm text-muted-foreground">{userName}님 환영합니다</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      <Toaster />
    </div>
  )
}
