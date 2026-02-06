'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen } from 'lucide-react'
import { getCenters, Center } from '@/app/actions/center'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [center, setCenter] = useState('')
  const [hall, setHall] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [availableCenters, setAvailableCenters] = useState<Center[]>([])

  useEffect(() => {
    async function loadCenters() {
      const res = await getCenters()
      if (res.centers) {
        setAvailableCenters(res.centers)
      }
    }
    if (!isLogin) {
      loadCenters()
    }
  }, [isLogin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        // Detect if input is email or phone number
        // Detect if input is email or phone number
        let email: string = ''
        let authResponse: { user: any; session: any } | null = null

        if (phoneNumber.includes('@')) {
          // Input is already an email (admin login)
          email = phoneNumber
          authResponse = await signIn(email, password)
        } else {
          // Input is a phone number - try student first, then teacher
          const cleanPhone = phoneNumber.replace(/-/g, '')

          try {
            // First try as student
            email = `${cleanPhone}@student.local`
            authResponse = await signIn(email, password)
          } catch (studentError) {
            // If student login fails, try as teacher
            try {
              email = `${cleanPhone}@teacher.local`
              authResponse = await signIn(email, password)
            } catch (teacherError) {
              // If both fail, throw the error
              throw studentError
            }
          }
        }

        if (!authResponse || !authResponse.user) {
          throw new Error('로그인 정보를 가져올 수 없습니다.')
        }

        const { user } = authResponse

        // Get user profile to determine role
        const { supabase } = await import('@/lib/supabase/client')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        console.log('Login User ID:', user.id)
        if (profileError) {
          console.error('Profile Fetch Error:', profileError)
          throw new Error('프로필 정보를 불러오는데 실패했습니다.')
        }
        console.log('Profile Role:', profile?.role)

        const isAdminRole = ['admin', 'manager', 'super_manager'].includes(profile?.role || '')

        if (isAdminRole) {
          router.push('/admin/dashboard')
        } else if (profile?.role === 'teacher') {
          router.push('/teacher/dashboard')
        } else {
          router.push('/student/dashboard')
        }
      } else {
        // Sign Up
        if (!center && (role === 'teacher' || role === 'student')) {
          // center is required for students, maybe optional for teacher? 
          // implementation plan said center/hall assignment for existing teachers.
          // Let's assume center is good to have.
          if (!center) throw new Error('센터를 선택해주세요.')
        }

        const email = `${phoneNumber.replace(/-/g, '')}@${role}.local`

        await signUp(email, password, fullName, role, center)

        // Auto login after signup
        const { user } = await signIn(email, password)

        // Additional Logic based on Role
        const { supabase } = await import('@/lib/supabase/client')

        if (role === 'student') {
          // Existing Student Logic
          if (hall) {
            await supabase.from('profiles').update({ hall }).eq('id', user.id)
          }
        } else if (role === 'teacher') {
          // New Teacher Logic: Create entry in 'teachers' table
          const { registerTeacherProfile } = await import('@/app/actions/teacher')
          await registerTeacherProfile({
            name: fullName,
            center,
            hall,
            profile_id: user.id
          })
        }

        // Wait a bit to ensure profile trigger fires (if any) and data is consistent
        await new Promise(resolve => setTimeout(resolve, 1500))

        if (role === 'teacher') {
          router.push('/teacher/dashboard')
        } else if (role === 'student') {
          router.push('/student/dashboard')
        } else {
          // Admin/Manager fallback
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          const isAdminRole = ['admin', 'manager', 'super_manager'].includes(profile?.role || '')
          if (isAdminRole) {
            router.push('/admin/dashboard')
          } else {
            router.push('/') // Default
          }
        }
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  const centers = availableCenters.filter(c => c.type === 'center')
  const halls = availableCenters.filter(c => c.type === 'hall')

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl animate-fade-in-up">
        <CardHeader className="space-y-3 text-center pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 transition-transform duration-300 hover:scale-105">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-heading font-bold text-white tracking-tight">
            ClassIn <span className="text-indigo-400">Archive</span>
          </CardTitle>
          <CardDescription className="text-slate-300 text-base">
            {isLogin
              ? '로그인하여 프리미엄 학습 자료를 확인하세요'
              : '새로운 학습 여정을 시작하세요'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-200 ml-1">
                  이름
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="홍길동"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
                />
              </div>
            )}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200 ml-1">
                    구분
                  </label>
                  <Select value={role} onValueChange={(val: any) => setRole(val)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500/50">
                      <SelectValue placeholder="구분 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">학생</SelectItem>
                      <SelectItem value="teacher">선생님</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200 ml-1">
                      센터
                    </label>
                    <Select value={center} onValueChange={(val) => setCenter(val)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500/50">
                        <SelectValue placeholder="센터 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {centers.length > 0 ? centers.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        )) : (
                          <SelectItem value="default" disabled>등록된 센터 없음</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200 ml-1">
                      관
                    </label>
                    <Select value={hall} onValueChange={(val) => setHall(val)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500/50">
                        <SelectValue placeholder="관 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {halls.length > 0 ? halls.map(h => (
                          <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
                        )) : (
                          <SelectItem value="default" disabled>등록된 관 없음</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-200 ml-1">
                전화번호 또는 이메일
              </label>
              <Input
                id="phone"
                type="text"
                placeholder="01012345678 또는 admin@example.com"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-200 ml-1">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
              />
            </div>

            {error && (
              <div className="text-sm text-red-200 bg-red-500/20 border border-red-500/30 p-3 rounded-xl flex items-center justify-center backdrop-blur-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-green-200 bg-green-500/20 border border-green-500/30 p-3 rounded-xl flex items-center justify-center backdrop-blur-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 border-none"
              disabled={loading}
            >
              {loading
                ? (isLogin ? '로그인 중...' : '계정 생성 중...')
                : (isLogin ? '로그인' : '회원가입')}
            </Button>

            <div className="text-center pt-2">
              <span className="text-sm text-slate-400">
                {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              </span>
              <Button
                type="button"
                variant="link"
                className="p-0 ml-2 h-auto text-indigo-300 hover:text-white"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setMessage('')
                }}
              >
                {isLogin ? '회원가입' : '로그인'}
              </Button>
            </div>

            {isLogin && (
              <div className="text-center mt-4 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="link"
                  className="text-xs text-slate-500 hover:text-slate-300 font-normal"
                  onClick={() => window.location.href = '/migrate-phone'}
                >
                  기존 이메일 계정을 전화번호로 변경하기
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="absolute bottom-6 text-center z-10">
        <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">
          Powered by ClassIn
        </p>
      </div>
    </div>
  )
}
