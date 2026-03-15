'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAdminPassword } from '@/app/actions/auth-admin'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, RefreshCcw, Trash2, AlertTriangle, CheckCircle2, Plus, FolderOpen, XCircle, Clock } from 'lucide-react'
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

    // Monitor heartbeat
    const [monitorAlive, setMonitorAlive] = useState<boolean | null>(null)
    const [monitorLastSeen, setMonitorLastSeen] = useState<string | null>(null)

    // Monitor config states
    const [configLoading, setConfigLoading] = useState(true)
    const [monitorConfig, setMonitorConfig] = useState<{ watchDirs: { center: string, path: string }[], autoUploadImages: boolean, autoUploadVideos: boolean }>({ watchDirs: [], autoUploadImages: false, autoUploadVideos: true })
    const [isSavingConfig, setIsSavingConfig] = useState(false)
    const [configError, setConfigError] = useState<string | null>(null)
    const [centers, setCenters] = useState<{ id: string, name: string }[]>([])

    // Load Monitor Config and User Role
    useEffect(() => {
        const loadPageData = async () => {
            try {
                // Determine active center
                const center = Cookies.get('active_center') || '전체'
                setActiveCenter(center)

                // 세션을 강제 갱신하여 만료된 토큰으로 API 호출하는 문제 방지
                const { data: { session } } = await supabase.auth.refreshSession()
                if (session) {
                    Cookies.set('sb-access-token', session.access_token, { expires: 7, path: '/', sameSite: 'lax' })
                    Cookies.set('sb-refresh-token', session.refresh_token, { expires: 7, path: '/', sameSite: 'lax' })

                    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
                    if (profileData) {
                        setUserRole(profileData.role)
                    }
                }

                // Fetch centers list
                const { data: centersData } = await supabase
                    .from('centers')
                    .select('id, name')
                    .eq('type', 'center')
                    .order('name')
                if (centersData) setCenters(centersData)

                // Fetch monitor config
                const token = Cookies.get('sb-access-token')
                const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
                const configRes = await fetch('/api/admin/system/monitor-config', {
                    headers: authHeaders,
                    credentials: 'include'
                })
                if (configRes.ok) {
                    const configData = await configRes.json()
                    if (configData && Array.isArray(configData.watchDirs)) {
                        setMonitorConfig(configData)
                    } else {
                        console.error('Monitor config: unexpected response shape', configData)
                        setConfigError('설정 데이터 형식이 올바르지 않습니다.')
                    }
                } else {
                    const errBody = await configRes.text().catch(() => '')
                    console.error('Monitor config fetch failed:', configRes.status, errBody)
                    setConfigError(`설정 불러오기 실패 (${configRes.status})`)
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

    // Check monitor heartbeat
    useEffect(() => {
        const checkHeartbeat = async () => {
            try {
                const { data } = await supabase
                    .from('system_config')
                    .select('value, updated_at')
                    .eq('key', 'monitor_heartbeat')
                    .single()
                if (data) {
                    const hb = JSON.parse(data.value)
                    const lastTime = new Date(hb.timestamp).getTime()
                    const isAlive = (Date.now() - lastTime) < 90 * 1000  // 90초 이내면 활성
                    setMonitorAlive(isAlive)
                    setMonitorLastSeen(hb.timestamp)
                } else {
                    setMonitorAlive(false)
                }
            } catch { setMonitorAlive(false) }
        }
        checkHeartbeat()
        const interval = setInterval(checkHeartbeat, 15000)
        return () => clearInterval(interval)
    }, [])

    const getAuthHeaders = (): Record<string, string> => {
        const token = Cookies.get('sb-access-token')
        return token ? { 'Authorization': `Bearer ${token}` } : {}
    }

    const handleSaveConfig = async () => {
        setIsSavingConfig(true)
        setConfigSaved(false)
        try {
            const res = await fetch('/api/admin/system/monitor-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(monitorConfig),
                credentials: 'include'
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save')
            }

            // 저장 후 다시 불러와서 확인
            const verifyRes = await fetch('/api/admin/system/monitor-config', {
                headers: getAuthHeaders(),
                credentials: 'include'
            })
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

    const addWatchDir = (centerName: string) => {
        setMonitorConfig(prev => ({
            ...prev,
            watchDirs: [...prev.watchDirs, { center: centerName, path: '' }]
        }))
    }

    const removeWatchDir = (index: number) => {
        setMonitorConfig(prev => {
            const newDirs = [...prev.watchDirs]
            newDirs.splice(index, 1)
            return { ...prev, watchDirs: newDirs }
        })
    }

    const updateWatchDirPath = (index: number, value: string) => {
        setMonitorConfig(prev => {
            const newDirs = [...prev.watchDirs]
            newDirs[index] = { ...newDirs[index], path: value }
            return { ...prev, watchDirs: newDirs }
        })
    }

    const getDirsForCenter = (centerName: string) => {
        return monitorConfig.watchDirs
            .map((dir, idx) => ({ ...dir, originalIndex: idx }))
            .filter(dir => dir.center === centerName)
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

    const [syncResult, setSyncResult] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<{
        status: string
        files_found?: number
        files_processed?: number
        log_message?: string
        error_message?: string
        started_at?: string
        completed_at?: string
    } | null>(null)
    const [syncRequestId, setSyncRequestId] = useState<string | null>(null)
    const [isPolling, setIsPolling] = useState(false)

    // Poll sync status
    useEffect(() => {
        if (!syncRequestId || !isPolling) return
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/admin/system/sync-status?id=${syncRequestId}`, {
                    headers: getAuthHeaders(),
                    credentials: 'include'
                })
                if (!res.ok) return
                const data = await res.json()
                setSyncStatus(data)
                if (data.status === 'done') {
                    setIsPolling(false)
                    setIsSyncing(false)
                    toast({ title: "동기화 완료", description: data.log_message || "동기화가 성공적으로 완료되었습니다." })
                } else if (data.status === 'error') {
                    setIsPolling(false)
                    setIsSyncing(false)
                    toast({ title: "동기화 오류", description: data.error_message || "동기화 중 오류가 발생했습니다.", variant: "destructive" })
                }
            } catch { /* ignore */ }
        }, 2000)
        return () => clearInterval(interval)
    }, [syncRequestId, isPolling])

    const handleSync = async () => {
        setIsSyncing(true)
        setSyncResult(null)
        setSyncStatus(null)
        try {
            const res = await fetch('/api/admin/system/trigger-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ center: activeCenter }),
                credentials: 'include'
            })
            const data = await res.json()
            if (data.success) {
                if (data.pending && !data.requestId) {
                    setSyncResult('이미 동기화 요청이 대기 중입니다.')
                    setIsSyncing(false)
                    toast({ title: "동기화 요청", description: "이미 대기 중인 요청이 있습니다." })
                } else {
                    setSyncResult(null)
                    setSyncRequestId(data.requestId)
                    if (data.monitorAlive === false) {
                        setSyncStatus({ status: 'pending', log_message: '⚠️ 폴더 모니터가 꺼져 있습니다. 로컬 PC에서 ClassIn-Start.bat을 실행해주세요.' })
                        toast({
                            title: "⚠️ 폴더 모니터 미실행",
                            description: "요청은 등록되었지만, 모니터가 꺼져 있어 동기화가 진행되지 않습니다. ClassIn-Start.bat을 실행해주세요.",
                            variant: "destructive"
                        })
                    } else {
                        setSyncStatus({ status: 'pending', log_message: '대기 중... 로컬 모니터 응답을 기다리는 중' })
                        toast({ title: "동기화 요청 전송됨", description: "로컬 모니터가 응답하면 진행 상황이 아래에 표시됩니다." })
                    }
                    setIsPolling(true)
                }
            } else {
                throw new Error(data.error)
            }
        } catch (err: any) {
            setSyncResult(null)
            setSyncStatus(null)
            setIsSyncing(false)
            toast({ title: "동기화 실패", description: err.message, variant: "destructive" })
        }
    }


    const handleDeleteAll = async () => {
        if (!confirm('정말로 모든 학생의 자료와 수업 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        setIsDeleting(true)
        try {
            const res = await fetch('/api/admin/system/bulk-delete', { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
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
                <Card className={`shadow-sm ${monitorAlive ? 'border-green-500/10' : 'border-red-500/20'}`}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {monitorAlive === null ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="font-medium text-sm">상태 확인 중...</span>
                            </div>
                        ) : monitorAlive ? (
                            <div className="flex items-center gap-2 text-green-500">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium text-sm">폴더 모니터 실행 중</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-500">
                                <XCircle className="h-5 w-5" />
                                <span className="font-medium text-sm">폴더 모니터 미실행</span>
                            </div>
                        )}
                        <div className={`text-xs p-3 rounded-lg ${monitorAlive ? 'text-muted-foreground bg-muted' : 'text-red-600 bg-red-50'}`}>
                            {monitorAlive ? (
                                <>
                                    <p>감시 경로: 아래 등록된 폴더 경로</p>
                                    <p className="mt-1">실시간 동기화: 활성화됨</p>
                                    {monitorLastSeen && <p className="mt-1">마지막 응답: {new Date(monitorLastSeen).toLocaleString('ko-KR')}</p>}
                                </>
                            ) : (
                                <>
                                    <p>로컬 PC에서 폴더 모니터가 실행되지 않고 있습니다.</p>
                                    <p className="mt-1">ClassIn-Start.bat을 실행하거나 관리자에게 문의하세요.</p>
                                    {monitorLastSeen && <p className="mt-1">마지막 응답: {new Date(monitorLastSeen).toLocaleString('ko-KR')}</p>}
                                </>
                            )}
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
                            {isSyncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> 진행 중...</> : "수동 동기화 실행"}
                        </Button>
                        {syncResult && (
                            <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    {syncResult}
                                </p>
                            </div>
                        )}
                        {syncStatus && (
                            <div className={`mt-3 p-3 rounded-lg border ${
                                syncStatus.status === 'done' ? 'bg-green-50 border-green-200' :
                                syncStatus.status === 'error' ? 'bg-red-50 border-red-200' :
                                'bg-blue-50 border-blue-200'
                            }`}>
                                {/* Status header */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    {syncStatus.status === 'pending' && <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                    {syncStatus.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin shrink-0" />}
                                    {syncStatus.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                                    {syncStatus.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                                    <span className={`text-xs font-medium ${
                                        syncStatus.status === 'done' ? 'text-green-700' :
                                        syncStatus.status === 'error' ? 'text-red-700' :
                                        'text-blue-700'
                                    }`}>
                                        {syncStatus.status === 'pending' && '대기 중'}
                                        {syncStatus.status === 'running' && '동기화 진행 중'}
                                        {syncStatus.status === 'done' && '동기화 완료'}
                                        {syncStatus.status === 'error' && '오류 발생'}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                {syncStatus.status === 'running' && syncStatus.files_found && syncStatus.files_found > 0 && (
                                    <div className="w-full bg-blue-100 rounded-full h-2 mb-1.5">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.round(((syncStatus.files_processed || 0) / syncStatus.files_found) * 100)}%` }}
                                        />
                                    </div>
                                )}
                                {/* Log message */}
                                {syncStatus.log_message && (
                                    <p className={`text-xs ${
                                        syncStatus.status === 'done' ? 'text-green-600' :
                                        syncStatus.status === 'error' ? 'text-red-600' :
                                        'text-blue-600'
                                    }`}>
                                        {syncStatus.log_message}
                                    </p>
                                )}
                                {syncStatus.error_message && (
                                    <p className="text-xs text-red-600 mt-1">{syncStatus.error_message}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Monitor Config Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>센터별 모니터 폴더 관리</CardTitle>
                    <CardDescription>각 센터별로 동기화할 폴더의 절대 경로를 지정합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    {configLoading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : configError ? (
                        <div className="py-4 px-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {configError}
                            </p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                                새로고침
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {centers.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4 border border-dashed rounded-lg">등록된 센터가 없습니다. 센터 관리에서 먼저 센터를 추가하세요.</p>
                            ) : (
                                centers.map(center => {
                                    const dirs = getDirsForCenter(center.name)
                                    return (
                                        <div key={center.id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FolderOpen className="h-4 w-4 text-primary" />
                                                    {center.name}
                                                </h4>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addWatchDir(center.name)}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                    폴더 추가
                                                </Button>
                                            </div>
                                            {dirs.length === 0 ? (
                                                <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded">
                                                    등록된 폴더가 없습니다.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {dirs.map((dir) => (
                                                        <div key={dir.originalIndex} className="flex gap-2 items-center">
                                                            <div className="flex-1">
                                                                <Input
                                                                    placeholder="폴더 절대 경로 (예: D:\OneDrive\강의실)"
                                                                    value={dir.path}
                                                                    onChange={(e) => updateWatchDirPath(dir.originalIndex, e.target.value)}
                                                                />
                                                            </div>
                                                            <Button variant="destructive" size="icon" onClick={() => removeWatchDir(dir.originalIndex)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">{dirs.length}개 폴더</p>
                                        </div>
                                    )
                                })
                            )}

                            <div className="flex items-center justify-between pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    전체 {monitorConfig.watchDirs.length}개 폴더 등록됨
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
