'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  School,
  ArrowRight,
  PlayCircle,
  BookOpen,
  CheckCircle2,
  Share2,
  PenTool,
  LineChart,
  Plus,
  Moon,
  Sun,
  ClipboardList
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'

export default function Home() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setIsLoggedIn(true)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile?.role) {
            setUserRole(profile.role)
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  const handleGetStarted = () => {
    if (isLoggedIn) {
      if (userRole === 'admin' || userRole === 'manager' || userRole === 'super_manager' || userRole === 'teacher') {
        router.push('/admin/dashboard')
      } else {
        router.push('/student/dashboard')
      }
    } else {
      router.push('/login')
    }
  }

  // Prevent hydration mismatch for theme toggle
  if (!isMounted) return null

  return (
    <div className="bg-background text-foreground font-sans transition-colors duration-300 antialiased overflow-x-hidden min-h-screen relative">
      <style dangerouslySetInnerHTML={{
        __html: `
        .mesh-gradient {
            background-color: hsla(247, 74%, 60%, 1);
            background-image: 
                radial-gradient(at 40% 20%, hsla(268, 67%, 66%, 1) 0px, transparent 50%),
                radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 1) 0px, transparent 50%),
                radial-gradient(at 0% 50%, hsla(263, 73%, 68%, 1) 0px, transparent 50%),
                radial-gradient(at 80% 50%, hsla(247, 56%, 51%, 1) 0px, transparent 50%),
                radial-gradient(at 0% 100%, hsla(265, 87%, 73%, 1) 0px, transparent 50%),
                radial-gradient(at 80% 100%, hsla(240, 100%, 70%, 1) 0px, transparent 50%),
                radial-gradient(at 0% 0%, hsla(243, 85%, 65%, 1) 0px, transparent 50%);
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .dark .glass-panel {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .blob {
            position: absolute;
            filter: blur(80px);
            z-index: 0;
            opacity: 0.6;
        }
      `}} />

      {/* Background Blobs */}
      <div className="blob w-96 h-96 bg-primary/40 rounded-full top-0 left-[-100px] animate-pulse pointer-events-none"></div>
      <div className="blob w-[500px] h-[500px] bg-purple-400/30 rounded-full top-[20%] right-[-150px] dark:opacity-20 pointer-events-none"></div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300">
        <div className="glass-panel mx-4 mt-4 rounded-2xl shadow-sm dark:shadow-none bg-background/60 dark:bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 flex items-center justify-center">
                  <Logo className="w-full h-full text-[#EE6A2A]" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-foreground">WP 과사람</span>
              </div>

              <div className="hidden md:flex space-x-8 items-center">
                <a className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium cursor-pointer">핵심 기능</a>
                <a className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium cursor-pointer">솔루션</a>
                <a className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium cursor-pointer">도입 문의</a>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {!isCheckingAuth && !isLoggedIn && (
                  <Link href="/login" className="hidden md:block text-sm font-medium text-foreground hover:text-primary transition-colors">
                    로그인
                  </Link>
                )}

                <Button
                  onClick={handleGetStarted}
                  disabled={isCheckingAuth}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50"
                >
                  {isCheckingAuth ? '로딩 중...' : (isLoggedIn ? '대시보드로 이동' : '무료로 시작하기')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            <div className="text-left space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                New Dashboard Available
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight text-foreground">
                모든 수업을 한 곳에 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">온라인 학습 아카이브</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                클래스인 수업 영상과 방대한 학습 자료를 체계적으로 관리하세요. 시간과 장소에 구애받지 않고 지난 수업을 완벽하게 복습할 수 있는 환경을 제공합니다.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-6 rounded-2xl font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-base"
                >
                  {isCheckingAuth ? '로딩 중...' : (isLoggedIn ? '대시보드로 이동' : '무료 체험 시작')}
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center justify-center gap-2 bg-background text-foreground border border-border px-8 py-6 rounded-2xl font-semibold hover:bg-muted transition-all duration-300 text-base"
                >
                  <PlayCircle className="w-5 h-5 text-primary" />
                  데모 영상 보기
                </Button>
              </div>

              <div className="pt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  <img alt="User avatar 1" className="w-8 h-8 rounded-full border-2 border-background object-cover" src="https://ui-avatars.com/api/?name=Alex&background=random" />
                  <img alt="User avatar 2" className="w-8 h-8 rounded-full border-2 border-background object-cover" src="https://ui-avatars.com/api/?name=Sarah&background=random" />
                  <img alt="User avatar 3" className="w-8 h-8 rounded-full border-2 border-background object-cover" src="https://ui-avatars.com/api/?name=Mike&background=random" />
                </div>
                <p>전국 <span className="font-bold text-foreground">10,000+</span>명의 학생과 선생님이 함께합니다.</p>
              </div>
            </div>

            {/* Dashboard Preview Graphic */}
            <div className="relative lg:h-[600px] w-full flex items-center justify-center" style={{ perspective: '1000px' }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-indigo-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-[3rem] transform rotate-3 scale-95 blur-2xl z-0"></div>

              <div className="relative bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-lg transform hover:scale-[1.02] transition-transform duration-500 z-10">
                {/* Simulated Header */}
                <div className="h-32 bg-gradient-to-r from-primary/5 to-purple-500/5 dark:from-slate-800/50 dark:to-slate-800/50 p-6 flex flex-col justify-center border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                      <School className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-primary uppercase tracking-wide mb-1">학생 프로필</div>
                      <div className="text-2xl font-bold text-foreground">김강민</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">student_1768659...</div>
                    </div>
                  </div>
                </div>

                {/* Simulated Stats */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">29</div>
                    <div className="text-xs text-muted-foreground">누적 수업</div>
                  </div>
                  <div className="p-4 text-center bg-primary/5">
                    <div className="text-2xl font-bold text-primary">86</div>
                    <div className="text-xs text-primary font-medium">학습 자료</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">98%</div>
                    <div className="text-xs text-muted-foreground">출석률</div>
                  </div>
                </div>

                {/* Simulated Activity */}
                <div className="p-6 space-y-4 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      최근 활동
                    </h3>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">오늘</span>
                  </div>

                  <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border cursor-pointer">
                    <div className="mt-1">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">미적분학 I: 도함수</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">자료 추가됨 • 2분 전</p>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all self-center" />
                  </div>

                  <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border cursor-pointer">
                    <div className="mt-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">기하 1단원 평가</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">제출 완료 • 22:30</p>
                    </div>
                    <div className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-2 py-1 rounded self-center">완료</div>
                  </div>
                </div>

                {/* Floating Add Button */}
                <div className="absolute bottom-6 right-6">
                  <div className="w-12 h-12 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-primary-foreground cursor-pointer hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Floating Status Badge */}
              <div className="absolute -bottom-10 -left-10 bg-card p-4 rounded-2xl shadow-xl border border-border w-48 animate-bounce delay-100 z-20" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">동기화 완료</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[100%]"></div>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>상태</span>
                  <span className="font-bold text-emerald-500">최신</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">차원이 다른 최상위권 교육 파트너</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <School className="w-8 h-8 text-indigo-500" /> EduTech
            </div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <BookOpen className="w-8 h-8 text-purple-500" /> LabSmart
            </div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Share2 className="w-8 h-8 text-blue-500" /> GlobalLang
            </div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <PenTool className="w-8 h-8 text-emerald-500" /> MindSet
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-[20%] right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-[10%] left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase mb-2">핵심 기능</h2>
            <p className="text-3xl md:text-4xl font-bold text-foreground mb-4">완벽한 복습을 위한 학습 관리 시스템</p>
            <p className="text-lg text-muted-foreground">지난 수업을 놓쳐도 걱정 마세요. 모든 학습 기록이 안전하게 보관됩니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <PlayCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">수업 영상 다시보기</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                실시간으로 진행된 모든 수업 영상이 자동으로 저장됩니다. 중요한 개념은 여러 번 반복해서 시청하며 확실히 이해할 수 있습니다.
              </p>
              <a className="inline-flex items-center text-primary font-medium hover:underline cursor-pointer">
                자세히 보기 <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            <div className="group bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg border border-border hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">체계적인 자료 관리</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                수업에 사용된 교재, 프린트물, 과제 등 모든 학습 자료가 회차별로 정리되어 제공됩니다. 클릭 한 번으로 손쉽게 다운로드하세요.
              </p>
              <a className="inline-flex items-center text-purple-600 font-medium hover:underline cursor-pointer">
                작동 방식 보기 <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            <div className="group bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg border border-border hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <LineChart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">학습 진도 추적</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                수강 중인 과목의 진행 상황과 과거 수업 이력을 직관적인 대시보드에서 한눈에 확인하고 통합적으로 관리할 수 있습니다.
              </p>
              <a className="inline-flex items-center text-blue-600 font-medium hover:underline cursor-pointer">
                리포트 확인하기 <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground p-12 md:p-20 text-center shadow-2xl shadow-primary/40">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900 opacity-20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

            <h2 className="relative text-3xl md:text-5xl font-bold mb-6">스마트 아카이브를 경험해보세요</h2>
            <p className="relative text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              학습의 연속성을 보장하는 가장 완벽한 방법. 지금 바로 로그인하여 지난 수업들을 복습해보세요.
            </p>

            <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleGetStarted}
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-muted px-8 py-6 rounded-xl font-bold text-lg transition-colors"
                disabled={isCheckingAuth}
              >
                {isCheckingAuth ? '로딩 중...' : (isLoggedIn ? '대시보드로 이동' : '무료로 시작하기')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground px-8 py-6 rounded-xl font-bold text-lg transition-colors hover:text-white"
              >
                도입 문의하기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Logo className="w-7 h-7 text-primary-foreground translate-y-[1px]" />
                <span className="font-extrabold text-lg text-foreground">WP 과사람</span>
              </div>
              <p className="text-sm text-muted-foreground">
                언제 어디서나 이어지는 배움의 공간
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">프로덕트</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a className="hover:text-primary transition-colors cursor-pointer">핵심 기능</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">솔루션</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">요금 안내</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">회사 소개</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a className="hover:text-primary transition-colors cursor-pointer">WP 아카데미</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">채용 정보</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">블로그</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">고객 지원</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a className="hover:text-primary transition-colors cursor-pointer">개인정보처리방침</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">이용약관</a></li>
                <li><a className="hover:text-primary transition-colors cursor-pointer">보안 정책</a></li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">© 2026 WP 과사람. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
