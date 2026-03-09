'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import {
    BarChart3,
    Users,
    BookOpen,
    FileImage,
    TrendingUp,
    Calendar,
    Search,
    Filter,
    ChevronRight,
    Loader2,
    Building2,
    ArrowUpRight
} from 'lucide-react'

interface ReportStats {
    totalStudents: number
    totalClasses: number
    totalMaterials: number
    activeToday: number
}

interface RecentClass {
    id: string
    title: string
    class_date: string
    student: {
        id: string
        full_name: string
        center?: string
        hall?: string
    }
}

export default function AdminReportsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<ReportStats>({
        totalStudents: 0,
        totalClasses: 0,
        totalMaterials: 0,
        activeToday: 0
    })
    const [recentClasses, setRecentClasses] = useState<RecentClass[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCenter, setSelectedCenter] = useState('전체')
    const [selectedHall, setSelectedHall] = useState('전체')
    const [chartData, setChartData] = useState<any[]>([])

    const centers = ['전체', '동래센터', '중등관', '고등관']
    const halls = ['전체', '801호', '802호', '803호']

    useEffect(() => {
        loadReportData()
    }, [selectedCenter, selectedHall])

    const loadReportData = async () => {
        try {
            const { getDashboardData } = await import('@/app/actions/dashboard')
            const data = await getDashboardData(
                selectedCenter !== '전체' ? selectedCenter : undefined,
                selectedHall !== '전체' ? selectedHall : undefined
            )

            setStats({
                totalStudents: data.stats.totalStudents,
                totalClasses: data.stats.totalClasses,
                totalMaterials: data.stats.totalMaterials,
                activeToday: data.recentClasses?.length || 0
            })

            setRecentClasses(data.recentClasses || [])

            // Generate dummy chart data for weekly activity
            const days = ['월', '화', '수', '목', '금', '토', '일']
            const mockChart = days.map(day => ({
                name: day,
                value: Math.floor(Math.random() * 20) + 5
            }))
            setChartData(mockChart)

        } catch (error) {
            console.error('Error loading report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }

    const filteredClasses = recentClasses.filter(cls =>
        cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-brand-500" />
                    <p className="text-slate-500 font-medium">관리자 리스트를 동기화 중...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em]">Management Intelligence</p>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            세션 리포트 허브
                            <span className="text-xs font-normal text-slate-500 bg-white/5 border border-white/10 px-2 py-1 rounded">Admin Only</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                            <Calendar className="h-4 w-4 mr-2" />
                            Custom Range
                        </Button>
                        <Button className="bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                            Export Data <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </motion.div>

                {/* Filters Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md mb-8">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2 text-slate-500 px-2">
                                    <Filter className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Analysis Scope</span>
                                </div>

                                <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                                    <SelectTrigger className="w-[160px] bg-slate-950/50 border-white/5 text-white">
                                        <Building2 className="h-4 w-4 mr-2 text-slate-500" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                        {centers.map(center => (
                                            <SelectItem key={center} value={center}>{center}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={selectedHall} onValueChange={setSelectedHall}>
                                    <SelectTrigger className="w-[120px] bg-slate-950/50 border-white/5 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                        {halls.map(hall => (
                                            <SelectItem key={hall} value={hall}>{hall}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex-1 max-w-sm ml-auto">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder="수업명 또는 학생 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 bg-slate-950/50 border-white/5 text-slate-100 placeholder:text-slate-600 focus:border-brand-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'brand' },
                        { label: 'Classes Logged', value: stats.totalClasses, icon: BookOpen, color: 'emerald' },
                        { label: 'Materials Synced', value: stats.totalMaterials, icon: FileImage, color: 'violet' },
                        { label: 'Recent Activity', value: stats.activeToday, icon: TrendingUp, color: 'amber' },
                    ].map((item, i) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                        >
                            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
                                <div className={`absolute top-0 right-0 p-4 opacity-5 bg-${item.color}-500/20 rounded-bl-3xl group-hover:opacity-10 transition-opacity`}>
                                    <item.icon className="h-12 w-12" />
                                </div>
                                <CardContent className="p-6">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                                    <h3 className="text-3xl font-bold text-white tracking-tight">{item.value}</h3>
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none">+2.4%</span>
                                        <span className="text-[9px] text-slate-600 font-medium">from last week</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Chart Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="lg:col-span-3"
                    >
                        <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md h-full">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5">
                                <div>
                                    <CardTitle className="text-lg font-bold text-white">Daily Session Trends</CardTitle>
                                    <p className="text-xs text-slate-500 mt-0.5">최근 7일간의 학습자료 생성 통계</p>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#475569"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#ffffff05' }}
                                            contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 6 ? '#6366f1' : '#312e81'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Activity List */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="lg:col-span-2"
                    >
                        <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md h-full flex flex-col">
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="text-lg font-bold text-white">Recent Activity Feed</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                <div className="divide-y divide-white/5 overflow-y-auto max-h-[400px] scrollbar-hide">
                                    <AnimatePresence mode="popLayout">
                                        {filteredClasses.slice(0, 10).map((cls, idx) => (
                                            <motion.div
                                                key={cls.id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.8 + (idx * 0.05) }}
                                                className="p-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                                onClick={() => router.push(`/student/report/${cls.student?.id}`)}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
                                                            {cls.student?.full_name[0]}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">{cls.title}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium truncate">{cls.student?.full_name} • {cls.student?.center}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-[10px] text-slate-400 font-bold">{formatDate(cls.class_date)}</span>
                                                        <ChevronRight className="h-3 w-3 text-slate-700 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full h-12 rounded-none text-xs text-slate-500 hover:text-white hover:bg-white/5 border-t border-white/5 transition-all"
                                    onClick={() => router.push('/admin/dashboard')}
                                >
                                    Explore All Records <ArrowUpRight className="h-3 w-3 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
