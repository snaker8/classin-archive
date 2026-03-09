'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAdminPassword } from '@/app/actions/auth-admin'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, RefreshCcw, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Cookies from 'js-cookie'

export default function SettingsPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [userRole, setUserRole] = useState('')
    const [activeCenter, setActiveCenter] = useState('전체')
    const [isPageLoading, setIsPageLoading] = useState(true)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // System tools states
    const [isSyncing, setIsSyncing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Monitor config states
    const [configLoading, setConfigLoading] = useState(true)
    const [monitorConfig, setMonitorConfig] = useState<{ watchDirs: { center: string, path: string }[], autoUploadImages: boolean, autoUploadVideos: boolean }>({ watchDirs: [], autoUploadImages: false, autoUploadVideos: true })
    const [isSavingConfig, setIsSavingConfig] = useState(false)

    // Load Monitor Config and User Role
    useEffect(() => {
        const loadPageData = async () => {
            try {
                // Determine active center
                const center = Cookies.get('active_center') || '전체'
                setActiveCenter(center)

                // Fetch user role
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                    if (profileData) {
                        setUserRole(profileData.role)
                    }
                }

                // Fetch monitor config
                const res = await fetch('/api/admin/system/monitor-config')
                if (res.ok) {
                    const data = await res.json()
                    setMonitorConfig(data)
                }
            } catch (err) {
                console.error('Failed to load page data', err)
            } finally {
                setConfigLoading(false)
                setIsPageLoading(false)
            }
        }
        loadPageData()
    }, [])

    const [configSaved, setConfigSaved] = useState(false)

    const handleSaveConfig = async () => {
        setIsSavingConfig(true)
        setConfigSaved(false)
        try {
            const res = await fetch('/api/admin/system/monitor-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monitorConfig)
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save')
            }

            // 저장 후 다시 불러와서 확인
            const verifyRes = await fetch('/api/admin/system/monitor-config')
            if (verifyRes.ok) {
                const savedData = await verifyRes.json()
                setMonitorConfig(savedData)
            }

            setConfigSaved(true)
            toast({ title: "✅ 저장 완료", description: `모니터 폴더 ${monitorConfig.watchDirs.length}개 설정이 서버에 저장되었습니다.` })

            // 3초 후 체크표시 제거
            setTimeout(() => setConfigSaved(false), 3000)
        } catch (err: any) {
            toast({ title: "저장 실패", description: err.message, variant: "destructive" })
        } finally {
            setIsSavingConfig(false)
        }
    }

    const addWatchDir = () => {
        setMonitorConfig(prev => ({
            ...prev,
            watchDirs: [...prev.watchDirs, { center: '', path: '' }]
        }))
    }

    const removeWatchDir = (index: number) => {
        setMonitorConfig(prev => {
            const newDirs = [...prev.watchDirs]
            newDirs.splice(index, 1)
            return { ...prev, watchDirs: newDirs }
        })
    }

    const updateWatchDir = (index: number, field: 'center' | 'path', value: string) => {
        setMonitorConfig(prev => {
            const newDirs = [...prev.watchDirs]
            newDirs[index] = { ...newDirs[index], [field]: value }
            return { ...prev, watchDirs: newDirs }
        })
    }

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
                toast({ title: "오류 발생", description: res.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "오류 발생", description: "알 수 없는 오류가 발생했습니다.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const res = await fetch('/api/admin/system/trigger-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ center: activeCenter })
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "동기화 시작됨", description: "폴더 스캔이 백그라운드에서 시작되었습니다." })
            } else {
                throw new Error(data.error)
            }
        } catch (err: any) {
            toast({ title: "동기화 실패", description: err.message, variant: "destructive" })
        } finally {
            setIsSyncing(false)
        }
    }


    const handleDeleteAll = async () => {
        if (!confirm('정말로 모든 학생의 자료와 수업 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        setIsDeleting(true)
        try {
            const res = await fetch('/api/admin/system/bulk-delete', { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                toast({ title: "삭제 완료", description: "모든 자료와 수업이 초기화되었습니다." })
            } else {
                throw new Error(data.error)
            }
        } catch (err: any) {
            toast({ title: "삭제 실패", description: err.message, variant: "destructive" })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isPageLoading) {
        return <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    if (userRole !== 'super_manager') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-bold mb-2">접근 권한 없음</h2>
                <p className="text-muted-foreground">이 페이지는 슈퍼 관리자만 접근할 수 있습니다.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">설정</h1>
                <p className="text-muted-foreground">시스템 설정 및 계정 보안을 관리합니다.</p>
            </div>

            {/* System Status and Tools */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm border-green-500/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium text-sm">업로드 모니터링 엔진 정상</span>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                            <p>감시 경로: 아래 등록된 폴더 경로</p>
                            <p className="mt-1">실시간 동기화: 활성화됨</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-primary/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <RefreshCcw className="h-4 w-4 text-primary" />
                            자료 동기화
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-4">현재 선택된 센터({activeCenter})의 폴더를 스캔하여 새로운 자료를 동기화합니다.</p>
                        <Button size="sm" onClick={handleSync} disabled={isSyncing} className="w-full">
                            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : "수동 동기화 실행"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Monitor Config Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>센터별 모니터 폴더 관리</span>
                        <Button variant="outline" size="sm" onClick={addWatchDir}>+ 폴더 추가</Button>
                    </CardTitle>
                    <CardDescription>동기화할 구글 드라이브/원드라이브 폴더의 절대 경로를 각 센터별로 지정합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    {configLoading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="space-y-4">
                            {monitorConfig.watchDirs.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4 border border-dashed rounded-lg">등록된 감시 폴더가 없습니다.</p>
                            ) : (
                                <div className="space-y-3">
                                    {monitorConfig.watchDirs.map((dir, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <div className="w-1/3">
                                                <Input
                                                    placeholder="센터명 (예: 동래 의대관)"
                                                    value={dir.center}
                                                    onChange={(e) => updateWatchDir(idx, 'center', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="폴더 절대 경로 (예: D:\OneDrive\강의실)"
                                                    value={dir.path}
                                                    onChange={(e) => updateWatchDir(idx, 'path', e.target.value)}
                                                />
                                            </div>
                                            <Button variant="destructive" size="icon" onClick={() => removeWatchDir(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    {monitorConfig.watchDirs.length > 0
                                        ? `${monitorConfig.watchDirs.length}개 폴더 등록됨`
                                        : '등록된 폴더 없음'}
                                </p>
                                <Button
                                    onClick={handleSaveConfig}
                                    disabled={isSavingConfig}
                                    className={configSaved ? 'bg-green-600 hover:bg-green-600' : ''}
                                >
                                    {isSavingConfig ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
                                    ) : configSaved ? (
                                        <><CheckCircle2 className="mr-2 h-4 w-4" /> 저장 완료!</>
                                    ) : (
                                        '설정 저장'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <hr className="border-t" />

            {/* Account and Danger Zone */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Account Section */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>계정 보안</CardTitle>
                        <CardDescription>관리자 비밀번호를 변경합니다.</CardDescription>
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

                {/* Danger Zone Section */}
                <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            위험 구역
                        </CardTitle>
                        <CardDescription>시스템 전체에 영향을 미치는 작업입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">데이터 전체 초기화</h4>
                            <p className="text-xs text-muted-foreground">테스트 기간의 모든 학생 자료와 수업 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
                            <Button variant="destructive" className="w-full mt-2" onClick={handleDeleteAll} disabled={isDeleting}>
                                {isDeleting ? "삭제 중..." : "데이터 전체 삭제"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
