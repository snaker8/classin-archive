'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Phone } from 'lucide-react'
import { migrateToPhoneLogin } from '@/app/actions/migrate-phone'

export default function MigratePhonePage() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const result = await migrateToPhoneLogin(fullName, phoneNumber, password)

            if (result.error) {
                setError(result.error)
            } else if (result.success) {
                setSuccess(result.message || '성공적으로 변경되었습니다.')
                setTimeout(() => {
                    router.push('/login')
                }, 2000)
            }
        } catch (err: any) {
            setError(err.message || '오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-orange-500 rounded-full">
                            <Phone className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">전화번호로 변경</CardTitle>
                    <CardDescription>
                        기존 이메일 계정을 전화번호 로그인으로 변경합니다
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium">
                                이름 (등록된 이름)
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
                            <p className="text-xs text-muted-foreground">
                                관리자가 등록한 정확한 이름을 입력하세요
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-medium">
                                새 전화번호 (새 로그인 ID)
                            </label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="01012345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                현재 비밀번호
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="기존 비밀번호 입력"
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
                        {success && (
                            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                                {success}
                            </div>
                        )}

                        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                            {loading ? '변경 중...' : '전화번호로 변경'}
                        </Button>

                        <div className="text-center mt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.push('/login')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                로그인으로 돌아가기
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
