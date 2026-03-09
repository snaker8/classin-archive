'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, LogOut, Settings, Users, User, Menu, X, GraduationCap, BookOpen, FolderOpen, Building2, History, BarChart3, ChevronRight, ChevronLeft, Video, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Cookies from 'js-cookie'

const sidebarItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/admin/dashboard' },
  { icon: BookOpen, label: '반 관리', path: '/admin/groups' },
  { icon: Users, label: '학생 관리', path: '/admin/students' },
  { icon: GraduationCap, label: '선생님 관리', path: '/admin/teachers' },
  { icon: Building2, label: '센터/관 관리', path: '/admin/centers' },
  { icon: FolderOpen, label: '자료 관리', path: '/admin/materials' },
  { icon: History, label: '업로드 기록', path: '/admin/history' },
  { icon: Video, label: '복습 영상 관리', path: '/admin/video-archive' },
  { icon: Settings, label: '설정', path: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeCenter, setActiveCenter] = useState<string>('전체')

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
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

  // Active Center tracking
  useEffect(() => {
    const loadCenter = () => {
      const center = Cookies.get('active_center')
      if (center) {
        setActiveCenter(center)
      } else {
        setActiveCenter('전체')
      }
    }

    loadCenter()

    // Listen for custom event from center management page
    window.addEventListener('centerChanged', loadCenter)
    return () => window.removeEventListener('centerChanged', loadCenter)
  }, [])

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
    <div className="min-h-screen flex bg-background">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 lg:hidden flex items-center justify-between px-4 border-b bg-card z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground leading-tight">ClassIn Archive</span>
            <span className="text-[10px] text-primary flex items-center font-medium leading-tight">
              <MapPin className="w-2.5 h-2.5 mr-0.5" />
              {activeCenter === '전체' ? '전체 센터' : activeCenter}
            </span>
          </div>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed top-14 left-0 bottom-0 w-64 bg-card border-r z-50 transform transition-transform lg:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card border-r transition-all duration-300 z-50",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo & Collapse Button */}
        <div className="h-14 flex items-center justify-between px-4 border-b shrink-0">
          <div className={cn(
            "flex items-center gap-3 overflow-hidden",
            isSidebarCollapsed && "justify-center w-full"
          )}>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0 shadow-sm relative group overflow-hidden">
              <div className="absolute inset-0 bg-black/10 transition-opacity opacity-0 group-hover:opacity-100" />
              <BookOpen className="h-5 w-5 text-white relative z-10" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex flex-col justify-center">
                <p className="font-bold text-foreground truncate leading-tight mt-0.5">ClassIn Archive</p>
                <div className="flex items-center mt-0.5">
                  <p className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 rounded-full inline-flex items-center gap-1 w-max">
                    <MapPin className="w-3 h-3" />
                    {activeCenter === '전체' ? '전체 센터' : activeCenter}
                  </p>
                </div>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="mx-auto mt-3 p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isSidebarCollapsed && "justify-center",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t p-3 shrink-0">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">관리자</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title={isSidebarCollapsed ? "로그아웃" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              isSidebarCollapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isSidebarCollapsed && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
