'use client'

import { useEffect, useState, Suspense, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/client'
import { getTeacherDashboardData } from '@/app/actions/teacher'
import { createClassForGroup } from '@/app/actions/class'
import { TeacherUploadDialog } from '@/components/teacher/teacher-upload-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, CalendarDays, Plus, Upload, FileText, ChevronRight, Loader2, AlertCircle, GraduationCap, Users, Eye, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

function DashboardContent() {
    // 1. All hooks at the very top
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState('')

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedGroupId, setSelectedGroupId] = useState('')
    const [newClassTitle, setNewClassTitle] = useState('')
    const [newClassDate, setNewClassDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [isCreating, setIsCreating] = useState(false)
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

    // Derived values
    const teacherId = searchParams?.get('teacherId')
    const groups = useMemo(() => data?.groups || [], [data])

    useEffect(() => {
        let isMounted = true
        async function load() {
            setLoading(true)
            try {
                const profile = await getCurrentProfile()
                if (!profile) {
                    router.push('/login')
                    return
                }

                if (teacherId) {
                    const isAdminUser = ['admin', 'manager', 'super_manager'].includes(profile.role)
                    if (!isAdminUser) {
                        if (isMounted) setError('이 페이지를 볼 수 있는 권한이 없습니다.')
                        return
                    }

                    const { getTeacherDashboardDataByTeacherId } = await import('@/app/actions/teacher')
                    const res = await getTeacherDashboardDataByTeacherId(teacherId)
                    if (isMounted) {
                        if (res.error) setError(res.error)
                        else setData(res)
                    }
                } else {
                    if (profile.role !== 'teacher') {
                        if (['admin', 'manager', 'super_manager'].includes(profile.role)) {
                            router.push('/admin/dashboard')
                            return
                        }
                    }

                    const res = await getTeacherDashboardData(profile.id)
                    if (isMounted) {
                        if (res.error) setError(res.error)
                        else setData(res)
                    }
                }
            } catch (err: any) {
                console.error(err)
                if (isMounted) setError('데이터 로딩 중 오류가 발생했습니다.')
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        load()
        return () => { isMounted = false }
    }, [teacherId, router])

    const handleCreateClass = async () => {
        if (!selectedGroupId || !newClassTitle) {
            toast({ title: "정보 부족", description: "반과 수업 제목을 입력해주세요.", variant: "destructive" })
            return
        }
        setIsCreating(true)
        try {
            const res = await createClassForGroup(selectedGroupId, { title: newClassTitle, class_date: newClassDate })
            if (res.success) {
                toast({ title: "수업 생성 완료", description: `${res.count}명의 학생에게 수업이 생성되었습니다.` })
                setIsCreateOpen(false)
                setNewClassTitle('')
                window.location.reload()
            } else {
                toast({ title: "생성 실패", description: res.error, variant: "destructive" })
            }
        } catch (err) {
            toast({ title: "오류 발생", description: "수업 생성 중 오류가 발생했습니다.", variant: "destructive" })
        } finally {
            setIsCreating(false)
        }
    }



    // 2. Conditional Rendering instead of early returns
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-20">
                <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-2xl border border-destructive/20 flex flex-col items-center gap-3">
                    <AlertCircle className="h-10 w-10" />
                    <p className="font-bold">{error}</p>
                    <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">다시 시도</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-[1300px] mx-auto p-8 md:p-12 gap-10">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)] animate-pulse" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                            {teacherId ? 'Admin Context' : 'Teacher Portal'}
                        </p>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex-1 min-w-0 break-keep">
                        {teacherId ? (
                            <>
                                <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent italic pr-2">
                                    {data?.teacher?.name}
                                </span>
                                <span className="ml-1 font-medium opacity-60 italic text-xl">Teacher</span>
                            </>
                        ) : (
                            data?.teacher?.name ? (
                                <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent italic pr-2">
                                    {data?.teacher?.name} <span className="text-foreground ml-1">선생님 대시보드</span>
                                </span>
                            ) : '선생님 대시보드'
                        )}
                    </h1>
                    <p className="text-muted-foreground text-base max-w-xl leading-relaxed mt-2">
                        {teacherId
                            ? `${data?.teacher?.name} 선생님의 수업 현황을 모니터링 중입니다.`
                            : '오늘의 수업 일정과 자료를 한눈에 관리하세요.'}
                    </p>
                </div>
                <div className="flex gap-2 sm:gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/')}
                        className="bg-card/50 backdrop-blur-md border-border hover:border-primary/50 text-foreground px-4 sm:px-6 py-6 rounded-2xl gap-2 sm:gap-3 transition-all hover:shadow-lg hover:shadow-primary/5"
                    >
                        <Home className="h-5 w-5 text-primary" />
                        <span className="font-bold hidden sm:inline">홈으로</span>
                    </Button>
                    <Button variant="outline" className="bg-card/50 backdrop-blur-md border-border hover:border-primary/50 text-foreground px-4 sm:px-6 py-6 rounded-2xl gap-2 sm:gap-3 transition-all hover:shadow-lg hover:shadow-primary/5">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <span className="font-bold hidden sm:inline">이번 학기</span>
                    </Button>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 py-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(var(--primary),0.4)] gap-3 transition-all hover:-translate-y-1 active:scale-95">
                                <Plus className="h-5 w-5" strokeWidth={3} />
                                새 수업 시작
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">새 수업 만들기</DialogTitle>
                                <DialogDescription>반을 선택하고 오늘 진행할 수업의 제목을 입력하세요.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label className="font-bold px-1">대상 반 선택</Label>
                                    <select
                                        className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                        value={selectedGroupId}
                                        onChange={(e) => setSelectedGroupId(e.target.value)}
                                    >
                                        <option value="">반을 선택하세요</option>
                                        {groups.map((g: any) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="font-bold px-1">수업 제목</Label>
                                    <Input
                                        placeholder="예: 2월 2주차 개념 완성"
                                        className="h-12 rounded-xl"
                                        value={newClassTitle}
                                        onChange={(e) => setNewClassTitle(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="font-bold px-1">수업 날짜</Label>
                                    <Input
                                        type="date"
                                        className="h-12 rounded-xl"
                                        value={newClassDate}
                                        onChange={(e) => setNewClassDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full h-12 rounded-xl font-bold text-lg" onClick={handleCreateClass} disabled={isCreating}>
                                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : '수업 생성 및 배포'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </motion.header>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 flex flex-col gap-10">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <GraduationCap className="h-6 w-6 font-bold" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground tracking-tight">
                                    내 수업 관리
                                    <span className="ml-3 text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">{groups.length} active</span>
                                </h2>
                            </div>
                            <Button
                                variant="ghost"
                                className="text-primary font-bold hover:bg-primary/5 gap-1 group"
                                onClick={() => router.push(`/teacher/groups${teacherId ? `?teacherId=${teacherId}` : ''}`)}
                            >
                                전체 보기
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map((group: any, idx: number) => (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card
                                        className="bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden rounded-3xl"
                                        onClick={() => router.push(`/teacher/groups/${group.id}${teacherId ? `?teacherId=${teacherId}` : ''}`)}
                                    >
                                        <div
                                            className="h-44 bg-cover bg-center relative group-hover:scale-105 transition-transform duration-700"
                                            style={{
                                                backgroundImage: group.latestClass?.previewImage
                                                    ? `url(${group.latestClass.previewImage})`
                                                    : 'linear-gradient(to right bottom, hsl(var(--primary)/20%), hsl(var(--background)))'
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                                            {group.latestClass && (
                                                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl">
                                                    {new Date(group.latestClass.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            )}
                                            <div className="absolute bottom-4 left-6 right-6">
                                                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors leading-tight mb-1">{group.name}</h3>
                                                <p className="text-muted-foreground text-xs font-medium flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    {group.studentCount} Students
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-6 py-5 flex flex-col">
                                            <p className="text-muted-foreground text-sm line-clamp-1 mb-4">{group.description || 'No class description provided yet.'}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                                        <Eye className="h-4 w-4 text-primary/60" />
                                                        <span>--</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                                        <FileText className="h-4 w-4 text-primary/60" />
                                                        <span>--</span>
                                                    </div>
                                                </div>
                                                <div className="flex -space-x-3">
                                                    {group.students?.slice(0, 3).map((student: any, i: number) => (
                                                        <div key={student.id || i} className="h-8 w-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-black overflow-hidden shadow-sm">
                                                            {student.avatar_url ? <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" /> : (student.full_name?.slice(0, 1) || 'S')}
                                                        </div>
                                                    ))}
                                                    {group.studentCount > 3 && (
                                                        <div className="h-8 w-8 rounded-full border-2 border-card bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shadow-sm ring-1 ring-primary/20">
                                                            +{group.studentCount - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4">
                    <section className="sticky top-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <UploadCloud className="h-6 w-6 font-bold" />
                            </div>
                            <h2 className="text-xl font-black text-foreground tracking-tight">빠른 작업</h2>
                        </div>
                        <Card className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative group z-40">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                            <div
                                onClick={() => setIsUploadDialogOpen(true)}
                                className={cn(
                                    "relative z-50 border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center transition-all overflow-hidden cursor-pointer hover:border-primary hover:bg-primary/5 border-primary/20",
                                )}
                            >
                                <div className="h-20 w-20 rounded-[1.5rem] flex items-center justify-center mb-6 transition-all shadow-xl shadow-primary/5 bg-primary/10 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                                    <Upload className="h-10 w-10" />
                                </div>
                                <h3 className="text-lg font-black text-foreground mb-4">수업 자료 업로드</h3>

                                <Button type="button" className="pointer-events-auto relative z-50 mb-4 px-8 rounded-full font-bold shadow-md hover:shadow-lg transition-all">
                                    업로드 창 열기
                                </Button>

                                <p className="text-muted-foreground text-sm leading-relaxed px-4">PDF, PPTX, MP4, 이미지 파일을 <br /> 선택해서 업로드하세요</p>
                            </div>

                            <div className="mt-8 space-y-4">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-2">최근 업로드 자료</h4>
                                <div className="space-y-3">
                                    {data?.recentMaterials?.length > 0 ? (
                                        data.recentMaterials.map((m: any, idx: number) => (
                                            <div key={m.id || idx} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-colors">
                                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm flex-shrink-0"><FileText className="h-5 w-5" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{m.title || '제목 없음'}</p>
                                                    {m.created_at && <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{format(new Date(m.created_at), 'MMM d, HH:mm')}</p>}
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg flex-shrink-0" onClick={() => window.open(m.content_url, '_blank')}><ChevronRight className="h-4 w-4" /></Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10 opacity-70">
                                            <FileText className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                                            <p className="text-sm font-bold text-foreground">업로드된 자료가 없습니다</p>
                                            <p className="text-xs text-muted-foreground mt-1">위 영역을 클릭하여 자료를 추가해보세요.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </div>
            <TeacherUploadDialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                onSuccess={() => window.location.reload()}
                teacherId={data?.teacher?.id}
            />
        </div>
    )
}

export default function TeacherDashboard() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}
