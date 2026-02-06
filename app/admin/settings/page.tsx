'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAdminPassword } from '@/app/actions/auth-admin'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 6) {
            toast({
                title: "비밀번호 오류",
                description: "비밀번호는 최소 6자 이상이어야 합니다.",
                variant: "destructive"
            })
            return
        }

        if (password !== confirmPassword) {
            toast({
                title: "비밀번호 불일치",
                description: "비밀번호가 일치하지 않습니다.",
                variant: "destructive"
            })
            return
        }

        setLoading(true)
        try {
            const res = await updateAdminPassword(password)
            if (res.success) {
                toast({
                    title: "성공",
                    description: "비밀번호가 성공적으로 변경되었습니다.",
                })
                setPassword('')
                setConfirmPassword('')
            } else {
                toast({
                    title: "오류 발생",
                    description: res.error,
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "오류 발생",
                description: "알 수 없는 오류가 발생했습니다.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">설정</h1>
                <p className="text-muted-foreground">계정 및 시스템 설정을 관리합니다.</p>
            </div>

            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>비밀번호 변경</CardTitle>
                    <CardDescription>관리자 계정의 비밀번호를 변경합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">새 비밀번호</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="새 비밀번호 입력"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="새 비밀번호 다시 입력"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            비밀번호 변경
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
