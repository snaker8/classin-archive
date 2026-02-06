'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentProfile, signOut } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { BookOpen, LogOut, Settings, Users, User, Menu, X } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

            const adminRoles = ['admin', 'manager', 'super_manager']
            if (!adminRoles.includes(profile.role)) {
              console.log('Not admin, redirecting to student dashboard')
              router.push('/student/dashboard')
              return
            }

            setUserName(profile.full_name)
            setCurrentRole(profile.role)
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

  const navigate = (path: string) => {
    router.push(path)
    setIsMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground animate-pulse">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 border-b border-white/20 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 md:px-6 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-3 md:space-x-4 cursor-pointer group" onClick={() => navigate('/admin/settings')}>
              <div className="p-2 md:p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
                <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm md:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600 truncate max-w-[120px] md:max-w-none">관리자 대시보드</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium tracking-wide flex items-center gap-1">
                  {userName}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${currentRole === 'super_manager' ? 'bg-amber-100 text-amber-700' :
                    currentRole === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {currentRole === 'super_manager' ? '슈퍼관리자' :
                      currentRole === 'manager' ? '관리자' : '일반'}
                  </span>
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="hover:bg-primary/10 hover:text-primary transition-all duration-200">
                <BookOpen className="h-4 w-4 mr-2" />
                홈
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/teachers')} className="hover:bg-primary/10 hover:text-primary transition-all duration-200">
                <User className="h-4 w-4 mr-2" />
                선생님 관리
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-lg border-b shadow-lg animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col p-4 space-y-2">
              <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => navigate('/admin/dashboard')}>
                <BookOpen className="h-5 w-5 mr-3" />
                홈
              </Button>
              <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => navigate('/admin/teachers')}>
                <User className="h-5 w-5 mr-3" />
                선생님 관리
              </Button>
              <div className="h-px bg-border my-2" />
              <Button variant="ghost" className="justify-start h-12 text-base text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
                <LogOut className="h-5 w-5 mr-3" />
                로그아웃
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 mt-16 flex-1 animate-fade-in-up">
        {children}
      </main>

      <Toaster />
    </div>
  )
}

