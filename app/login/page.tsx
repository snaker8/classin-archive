'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        const { user } = await signIn(email, password)

        // Get user profile to determine role
        const { supabase } = await import('@/lib/supabase/client')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/student/dashboard')
        }
      } else {
        // Sign Up
        const { signUp } = await import('@/lib/supabase/client')
        await signUp(email, password, fullName)
        setMessage('회원가입이 완료되었습니다. 자동으로 로그인합니다...')

        // Auto login after signup
        const { user } = await signIn(email, password)

        // Wait a bit to ensure profile trigger fires
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { supabase } = await import('@/lib/supabase/client')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/student/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">ClassIn 학습 아카이브</CardTitle>
          <CardDescription>
            {isLogin
              ? '로그인하여 수업 자료를 확인하세요'
              : '새 계정을 만들어 학습을 시작하세요'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
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
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                이메일
              </label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                {message}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (isLogin ? '로그인 중...' : '가입 중...')
                : (isLogin ? '로그인' : '회원가입')}
            </Button>

            <div className="text-center mt-4 text-sm">
              <span className="text-muted-foreground">
                {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              </span>
              <Button
                type="button"
                variant="link"
                className="p-0 ml-2 h-auto"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setMessage('')
                }}
              >
                {isLogin ? '회원가입' : '로그인'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
