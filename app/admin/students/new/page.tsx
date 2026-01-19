'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { createStudent } from '@/app/actions/student'

export default function NewStudentPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)

  // Simple state for error handling since we might not want full useFormState complexity yet
  // or we can just handle it with a transition wrapper for better loading state

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      const result = await createStudent(null, formData)

      if (result.error) {
        alert(result.error)
      } else if (result.success) {
        alert('학생이 성공적으로 추가되었습니다.')
        router.push('/admin/dashboard')
        router.refresh() // Refresh to show new student
      }
    } catch (err) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>
        <div>
          <h2 className="text-3xl font-bold">새 학생 추가</h2>
          <p className="text-muted-foreground">학생 계정을 생성하세요</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>학생 정보</CardTitle>
          <CardDescription>
            학생의 기본 정보와 로그인 계정을 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4" ref={formRef}>
            <div className="space-y-2">
              <label className="text-sm font-medium">이름</label>
              <Input
                name="fullName"
                placeholder="홍길동"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">전화번호 (로그인 ID)</label>
              <Input
                type="tel"
                name="phoneNumber"
                placeholder="01012345678"
                required
              />
              <p className="text-xs text-muted-foreground">
                이 전화번호로 로그인합니다
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <Input
                type="password"
                name="password"
                placeholder="최소 6자 이상"
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/dashboard')}
                disabled={loading}
              >
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '생성 중...' : '학생 추가'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
