'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { BookOpen, LogOut, LayoutDashboard, Calendar, FolderOpen, Menu, X, User, ChevronRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentProfile } from '@/lib/supabase/client'

const navItems = [
  { icon: LayoutDashboard, label: '내 수업', path: '/student/dashboard' },
  { icon: Calendar, label: '일정', path: '/student/calendar' },
  { icon: FolderOpen, label: '자료실', path: '/student/materials' },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // Fetch profile for role check
      const profile = await getCurrentProfile()
      if (profile) {
        setUser((prev: any) => ({ ...prev, profile }))
      }

      setLoading(false)
    }
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigate = (path: string) => {
    router.push(path)
    setIsMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 h-14 border-b bg-card/95 backdrop-blur-lg">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/student/dashboard')}>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-foreground text-sm">ClassIn Archive</p>
                <p className="text-[10px] text-muted-foreground">학습 포털</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center ml-8 gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Admin Back Button */}
            {(user?.profile?.role === 'admin' || user?.profile?.role === 'manager' || user?.profile?.role === 'super_manager') && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-sm transition-all"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>관리자 홈</span>
              </button>
            )}

            {/* User Info - Desktop */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {user?.user_metadata?.full_name || '학생'}
                </p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Logout - Desktop */}
            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-card border-b shadow-lg">
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                );
              })}
              <div className="pt-2 mt-2 border-t space-y-1">
                {(user?.profile?.role === 'admin' || user?.profile?.role === 'manager' || user?.profile?.role === 'super_manager') && (
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors"
                  >
                    <Shield className="h-5 w-5" />
                    <span>관리자 대시보드</span>
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>로그아웃</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-14 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
