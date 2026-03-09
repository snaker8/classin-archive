'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStudentDetails } from '@/app/actions/student'
import { deleteClass } from '@/app/actions/class'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
    ArrowLeft, BookOpen, Trash2, Calendar as CalendarIcon, Search, Eye, Video,
    Users, ExternalLink, TrendingUp, Clock, FileText, ChevronRight, User,
    GraduationCap, BarChart3, Loader2, StickyNote, MonitorPlay
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ClassEditDialog } from '@/components/admin/class-edit-dialog'
import { NoteEditorDialog } from '@/components/note/note-editor-dialog'
import { cn } from '@/lib/utils'

export default function StudentDetailView() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [student, setStudent] = useState<any>(null)
    const [classes, setClasses] = useState<any[]>([])
    const [enrolledGroups, setEnrolledGroups] = useState<any[]>([])
    const [selectedDate, setSelectedDate] = useState<Date | undefined>()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClass, setSelectedClass] = useState<string>('')

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string)
        }
    }, [params.id])

    const loadData = async (id: string) => {
        setLoading(true)
        try {
            const result = await getStudentDetails(id)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "오류",
                    description: result.error
                })
                return
            }
            setStudent(result.student)
            setClasses(result.classes || [])
            setEnrolledGroups(result.enrolledGroups || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClass = async (classId: string) => {
        if (!confirm('정말 이 수업을 삭제하시겠습니까? 관련 자료가 모두 삭제됩니다.')) return

        try {
            const result = await deleteClass(classId)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "오류",
                    description: result.error
                })
            } else {
                toast({
                    title: "성공",
                    description: "수업이 삭제되었습니다."
                })
                loadData(params.id as string)
            }
        } catch (error) {
            console.error(error)
        }
    }

    // Get unique class titles for dropdown
    const uniqueClassTitles = useMemo(() => {
        const titles = new Set(classes.map(c => c.title))
        return Array.from(titles).sort()
    }, [classes])

    // Calculate stats
    const stats = useMemo(() => {
        const totalMaterials = classes.reduce((sum, c) => sum + (c.materials?.length || 0), 0)
        const thisMonth = classes.filter(c => {
            const date = new Date(c.class_date)
            const now = new Date()
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        }).length
        return { totalClasses: classes.length, totalMaterials, thisMonth }
    }, [classes])

    // Process classes for timeline
    const timelineData = useMemo(() => {
        let filtered = [...classes]

        if (selectedClass) {
            filtered = filtered.filter(c => c.title === selectedClass)
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(query) ||
                (c.description && c.description.toLowerCase().includes(query))
            )
        }

        if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            filtered = filtered.filter(c => c.class_date === dateStr)
        }

        const grouped: Record<string, any[]> = {}
        filtered.forEach(cls => {
            const date = cls.class_date
            if (!grouped[date]) grouped[date] = []
            grouped[date].push(cls)
        })

        return Object.entries(grouped).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    }, [classes, searchQuery, selectedDate, selectedClass])

    const classDates = useMemo(() => {
        return new Set(classes.map(c => c.class_date))
    }, [classes])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground font-medium">학생 정보를 불러오는 중...</p>
                </motion.div>
            </div>
        )
    }

    if (!student) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="p-8 text-center border-dashed">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">학생 정보를 찾을 수 없습니다.</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        돌아가기
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/10 via-violet-50 to-blue-50 border"
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-violet-200 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        학생 목록
                    </Button>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shrink-0">
                                <GraduationCap className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Student Profile</p>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{student.full_name}</h1>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => window.open(`/student/dashboard?studentId=${params.id}`, '_blank')}
                            variant="secondary"
                            className="shrink-0 shadow-sm bg-white/80 hover:bg-white text-primary font-semibold"
                        >
                            <MonitorPlay className="w-4 h-4 mr-2" />
                            학생 대시보드 미리보기
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                {[
                    { label: '총 수업', value: stats.totalClasses, icon: BookOpen, color: 'text-primary', bgColor: 'bg-primary/10' },
                    { label: '이번 달', value: stats.thisMonth, icon: CalendarIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
                    { label: '수강 반', value: enrolledGroups.length, icon: Users, color: 'text-violet-600', bgColor: 'bg-violet-50' },
                    { label: '총 자료', value: stats.totalMaterials, icon: FileText, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
                ].map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                        <Card className="border hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Filters and Info */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-1 space-y-4"
                >
                    {/* Enrolled Groups Card */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-violet-50">
                                    <Users className="h-4 w-4 text-violet-600" />
                                </div>
                                수강 중인 반
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {enrolledGroups.length > 0 ? (
                                <div className="space-y-2">
                                    {enrolledGroups.map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                                            onClick={() => router.push(`/admin/groups/${group.id}`)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm text-foreground">{group.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{group.description || '설명 없음'}</div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                                    배정된 반이 없습니다.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Date Filter Card */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-50">
                                    <Search className="h-4 w-4 text-blue-600" />
                                </div>
                                검색 및 필터
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="수업 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {uniqueClassTitles.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">반 필터</label>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full p-2.5 border rounded-lg bg-background text-sm"
                                    >
                                        <option value="">모든 반</option>
                                        {uniqueClassTitles.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="rounded-xl border p-3">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    modifiers={{ hasClass: (date) => classDates.has(format(date, 'yyyy-MM-dd')) }}
                                    modifiersClassNames={{ hasClass: 'has-class-day' }}
                                    locale={ko}
                                    className="mx-auto"
                                />
                            </div>

                            {(selectedDate || selectedClass || searchQuery) && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setSelectedDate(undefined)
                                        setSelectedClass('')
                                        setSearchQuery('')
                                    }}
                                >
                                    필터 초기화
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Right: Timeline */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            학습 기록
                        </h3>
                        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            총 {classes.length}개 수업
                        </span>
                    </div>

                    {timelineData.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                                <p className="font-medium">해당 조건의 수업 기록이 없습니다.</p>
                                <p className="text-sm">다른 날짜나 검색어를 시도해보세요.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence mode="popLayout">
                                {timelineData.map(([date, classList], dateIdx) => (
                                    <motion.div
                                        key={date}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: dateIdx * 0.05 }}
                                        className="relative pl-6 border-l-2 border-primary/20"
                                    >
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-background shadow-sm" />

                                        <div className="flex items-center gap-2 mb-4">
                                            <h4 className="text-base font-bold text-foreground">
                                                {format(parseISO(date), 'M월 d일', { locale: ko })}
                                            </h4>
                                            <span className="text-xs text-muted-foreground">
                                                {format(parseISO(date), 'EEEE', { locale: ko })}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {classList.map((cls: any, clsIdx: number) => (
                                                <motion.div
                                                    key={cls.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: clsIdx * 0.03 }}
                                                >
                                                    <Card className="border overflow-hidden hover:shadow-md transition-all group">
                                                        <CardContent className="p-0">
                                                            <div className="flex flex-col sm:flex-row">
                                                                <div className="flex-1 p-4">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <h5 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                            {cls.title}
                                                                        </h5>
                                                                    </div>

                                                                    {cls.description && (
                                                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                                            {cls.description}
                                                                        </p>
                                                                    )}

                                                                    <div className="flex items-center flex-wrap gap-2">
                                                                        {cls.materials?.some((m: any) => m.type === 'blackboard_image') && (
                                                                            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                                                                <BookOpen className="h-3 w-3" />
                                                                                판서
                                                                            </span>
                                                                        )}
                                                                        {cls.materials?.some((m: any) => m.type === 'video_link') && (
                                                                            <span className="flex items-center gap-1 text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full">
                                                                                <Video className="h-3 w-3" />
                                                                                영상
                                                                            </span>
                                                                        )}
                                                                        {cls.materials?.some((m: any) => m.type === 'teacher_blackboard_image') && (
                                                                            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                                                                                <FileText className="h-3 w-3" />
                                                                                선생님 판서
                                                                            </span>
                                                                        )}
                                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                                                            <Clock className="h-3 w-3" />
                                                                            {format(parseISO(cls.created_at), 'HH:mm')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l divide-x sm:divide-x-0 sm:divide-y">
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="flex-1 rounded-none h-auto py-3 hover:bg-primary/5 hover:text-primary"
                                                                        onClick={() => window.open(`/viewer/${cls.id}`, '_blank')}
                                                                    >
                                                                        <Eye className="h-4 w-4 sm:mr-2" />
                                                                        <span className="hidden sm:inline">보기</span>
                                                                    </Button>
                                                                    <NoteEditorDialog
                                                                        classId={cls.id}
                                                                        onSuccess={() => loadData(params.id as string)}
                                                                        trigger={
                                                                            <Button
                                                                                variant="ghost"
                                                                                className="flex-1 rounded-none h-auto py-3 hover:bg-amber-50 hover:text-amber-600"
                                                                            >
                                                                                <StickyNote className="h-4 w-4 sm:mr-2" />
                                                                                <span className="hidden sm:inline">노트</span>
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    <ClassEditDialog
                                                                        cls={cls}
                                                                        onSuccess={() => loadData(params.id as string)}
                                                                    />
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="flex-1 rounded-none h-auto py-3 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                                                        onClick={() => handleDeleteClass(cls.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 sm:mr-2" />
                                                                        <span className="hidden sm:inline">삭제</span>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
