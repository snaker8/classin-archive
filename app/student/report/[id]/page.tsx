'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    FileImage,
    Video,
    ChevronRight,
    TrendingUp,
    Loader2,
    Sparkles,
    GraduationCap,
    Play,
    Clock,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassItem {
    id: string
    title: string
    class_date: string
    material_count: number
    video_count: number
}

interface StudentProfile {
    id: string
    full_name: string
    grade?: string
    center?: string
    hall?: string
}

export default function StudentReportPage() {
    const router = useRouter()
    const params = useParams()
    const studentId = params.id as string

    const [student, setStudent] = useState<StudentProfile | null>(null)
    const [classes, setClasses] = useState<ClassItem[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalMaterials: 0,
        totalVideos: 0,
        recentDate: ''
    })
    const [chartData, setChartData] = useState<any[]>([])

    useEffect(() => {
        loadStudentData()
    }, [studentId])

    const loadStudentData = async () => {
        try {
            const { getStudentDetails } = await import('@/app/actions/student')
            const data = await getStudentDetails(studentId)

            if (data.error) {
                console.error('Error:', data.error)
                return
            }

            if (data.student) {
                setStudent(data.student)
            }

            if (data.classes) {
                const transformedClasses = data.classes.map((cls: any) => ({
                    id: cls.id,
                    title: cls.title,
                    class_date: cls.class_date,
                    material_count: (cls.materials || []).filter((m: any) =>
                        m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image'
                    ).length,
                    video_count: (cls.materials || []).filter((m: any) => m.type === 'video_link').length
                }))

                setClasses(transformedClasses)

                const chartItems = [...transformedClasses].reverse().slice(-7).map(cls => ({
                    name: cls.title.length > 8 ? cls.title.substring(0, 8) + '...' : cls.title,
                    materials: cls.material_count
                }))
                setChartData(chartItems)

                const totalMaterials = transformedClasses.reduce((sum: number, c: ClassItem) => sum + (c.material_count || 0), 0)
                const totalVideos = transformedClasses.reduce((sum: number, c: ClassItem) => sum + (c.video_count || 0), 0)
                const recentDate = transformedClasses[0]?.class_date || ''

                setStats({
                    totalClasses: transformedClasses.length,
                    totalMaterials,
                    totalVideos,
                    recentDate
                })
            }
        } catch (error) {
            console.error('Error loading student data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground font-medium">학습 리포트를 불러오는 중...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b shadow-sm"
            >
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            뒤로
                        </Button>
                        <div className="h-8 w-px bg-border hidden md:block" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg">
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-foreground">
                                        {student?.full_name}
                                    </h1>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                        {student?.grade || '학생'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {student?.center && `${student.center} • `}학습 리포트
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Status</p>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-foreground">Active Learner</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: '총 수업', value: stats.totalClasses, icon: BookOpen, color: 'primary', bgColor: 'bg-primary/10' },
                        { label: '칠판 자료', value: stats.totalMaterials, icon: FileImage, color: 'blue-600', bgColor: 'bg-blue-50' },
                        { label: '수업 영상', value: stats.totalVideos, icon: Video, color: 'rose-600', bgColor: 'bg-rose-50' },
                        { label: '평균 자료', value: (stats.totalMaterials / (stats.totalClasses || 1)).toFixed(1), icon: Sparkles, color: 'amber-600', bgColor: 'bg-amber-50' },
                    ].map((item, i) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="border hover:shadow-lg transition-all duration-300 group">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                                            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                {item.value}
                                            </h3>
                                        </div>
                                        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", item.bgColor)}>
                                            <item.icon className={cn("h-5 w-5", `text-${item.color}`)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Progress Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2"
                    >
                        <Card className="border h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                                <div>
                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-primary/10">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                        </div>
                                        학습 성취도 분석
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">최근 7회 수업 자료 업로드 추이</p>
                                </div>
                                <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
                                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-700">+12% 전월대비</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorMaterialsLight" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                                fontSize: '12px'
                                            }}
                                            itemStyle={{ color: '#6366f1' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="materials"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorMaterialsLight)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Activity Timeline */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className="border h-full">
                            <CardHeader className="border-b">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-violet-50">
                                        <Calendar className="h-4 w-4 text-violet-600" />
                                    </div>
                                    최근 수업
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden">
                                <div className="divide-y">
                                    <AnimatePresence mode="popLayout">
                                        {classes.slice(0, 5).map((cls, idx) => (
                                            <motion.div
                                                key={cls.id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 + (idx * 0.1) }}
                                                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                                                onClick={() => router.push(`/student/viewer/${cls.id}`)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
                                                        {cls.title}
                                                    </h4>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(cls.class_date)}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <FileImage className="h-3 w-3 text-blue-500" />
                                                        {cls.material_count}
                                                    </div>
                                                    {cls.video_count > 0 && (
                                                        <div className="flex items-center gap-1 text-rose-500">
                                                            <Play className="h-3 w-3" />
                                                            <span>영상</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                {classes.length > 5 && (
                                    <Button
                                        variant="ghost"
                                        className="w-full h-12 rounded-none text-xs text-primary hover:text-primary hover:bg-primary/5 border-t"
                                    >
                                        전체 보기 <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                )}
                                {classes.length === 0 && (
                                    <div className="p-8 text-center">
                                        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">수업 기록이 없습니다</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* All Classes List */}
                {classes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mt-8"
                    >
                        <Card className="border">
                            <CardHeader className="border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-emerald-50">
                                            <BookOpen className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        전체 수업 목록
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                        총 {classes.length}개
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {classes.map((cls, idx) => (
                                        <motion.div
                                            key={cls.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.8 + (idx * 0.02) }}
                                            className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group flex items-center justify-between"
                                            onClick={() => router.push(`/student/viewer/${cls.id}`)}
                                        >
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-primary">{idx + 1}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                        {cls.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(cls.class_date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    {cls.material_count > 0 && (
                                                        <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                                                            <FileImage className="h-3 w-3" />
                                                            {cls.material_count}
                                                        </span>
                                                    )}
                                                    {cls.video_count > 0 && (
                                                        <span className="flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded-full">
                                                            <Video className="h-3 w-3" />
                                                            {cls.video_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </main>
        </div>
    )
}
