'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { BookOpen, LogOut, LayoutDashboard, Menu, X, User, ChevronRight, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentProfile } from '@/lib/supabase/client'

const navItems = [
  { icon: LayoutDashboard, label: '학습 현황', path: '/parent/dashboard' },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
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

      const profile = await getCurrentProfile()
      if (profile && profile.role !== 'parent') {
        // Not a parent, redirect
        router.push('/login')
        return
      }

      setLoading(false)
    }
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login')
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/parent/dashboard')}>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-foreground text-sm">ClassIn Archive</p>
                <p className="text-[10px] text-muted-foreground">학부모 포털</p>
              </div>
            </div>

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

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 pl-3 border-l">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">학부모</p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-card border-b shadow-lg">
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
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
              <div className="pt-2 mt-2 border-t">
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

      <main className="pt-14 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
