'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Video,
    RefreshCcw,
    Trash2,
    ExternalLink,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    Loader2,
    Calendar,
    User,
    BookOpen,
    Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    getVideoArchive,
    deleteArchiveRecord,
    retryVideoProcessing
} from '@/app/actions/video-archive'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { VideoUploadDialog } from '@/components/admin/video-upload-dialog'

export default function VideoArchivePage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'processing' | 'completed' | 'failed'>('all')
    const [isUploadOpen, setIsUploadOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const res = await getVideoArchive()
            if (res?.data) {
                setData(res.data)
            } else if (res?.error) {
                console.error('Error from server:', res.error)
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('기록을 삭제하시겠습니까? (DB 기록만 삭제됩니다.)')) return
        try {
            const res = await deleteArchiveRecord(id)
            if (res?.success) loadData()
            else alert(res?.error || '삭제 중 오류가 발생했습니다.')
        } catch (error) {
            console.error(error)
            alert('삭제 중 오류가 발생했습니다.')
        }
    }

    async function handleRetry(id: string) {
        try {
            const res = await retryVideoProcessing(id)
            if (res?.success) loadData()
            else alert(res?.error || '재시도 중 오류가 발생했습니다.')
        } catch (error) {
            console.error(error)
            alert('재시도 중 오류가 발생했습니다.')
        }
    }

    const filteredData = data.filter(item => {
        const matchesSearch =
            (item.title?.toLowerCase().includes(search.toLowerCase())) ||
            (item.class?.title?.toLowerCase().includes(search.toLowerCase())) ||
            (item.class?.student?.full_name?.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus = filterStatus === 'all' || item.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed':
                return {
                    label: '완료',
                    icon: CheckCircle2,
                    variant: 'default' as const,
                    className: "bg-emerald-50 text-emerald-600 border-emerald-200"
                }
            case 'failed':
                return {
                    label: '실패',
                    icon: AlertCircle,
                    variant: 'destructive' as const,
                    className: "bg-rose-50 text-rose-600 border-rose-200"
                }
            default:
                return {
                    label: '대기중',
                    icon: Clock,
                    variant: 'secondary' as const,
                    className: "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                }
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Link href="/admin/dashboard">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                대시보드로 돌아가기
                            </Link>
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-100">
                                <Video className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI 복습 영상 관리</h1>
                                <p className="text-slate-500 mt-1">자동 편집 및 업로드 현황을 모니터링합니다.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsUploadOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            수동 업로드
                        </Button>
                        <Button variant="outline" size="sm" onClick={loadData} className="bg-white shadow-sm border-slate-200">
                            <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            새로고침
                        </Button>
                    </div>
                </div>

                {/* Filters & Stats Card */}
                <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                                {(['all', 'processing', 'completed', 'failed'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        variant={filterStatus === s ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setFilterStatus(s)}
                                        className={cn(
                                            "capitalize",
                                            filterStatus === s ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {s === 'all' ? '전체' :
                                            s === 'processing' ? '처리중' :
                                                s === 'completed' ? '완료' : '실패'}
                                    </Button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="학생 또는 수업명 검색..."
                                    className="pl-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid gap-4">
                    {loading && data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-slate-500 font-medium">데이터를 불러오는 중...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Video className="h-12 w-12 text-slate-200 mb-4" />
                            <p className="text-slate-500">대상이 없습니다.</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredData.map((item, idx) => {
                                const status = getStatusInfo(item.status)
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Card className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white">
                                            <CardContent className="p-0">
                                                <div className="flex flex-col md:flex-row items-stretch">
                                                    {/* Status Bar */}
                                                    <div className={cn("w-full md:w-1.5 shrink-0",
                                                        item.status === 'completed' ? "bg-emerald-500" :
                                                            item.status === 'failed' ? "bg-rose-500" : "bg-amber-500"
                                                    )} />

                                                    <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-bold text-slate-900 border-b border-transparent group-hover:border-slate-900 transition-all inline-block">
                                                                    {item.title || item.file_path.split('/').pop()}
                                                                </h3>
                                                                <Badge className={cn("text-[10px] uppercase font-bold tracking-wider", status.className)}>
                                                                    <status.icon className="h-3 w-3 mr-1" />
                                                                    {status.label}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                                                <div className="flex items-center gap-1.5">
                                                                    <BookOpen className="h-3.5 w-3.5" />
                                                                    <span>{item.class?.title || '수업 미지정'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    <span>{item.class?.student?.full_name || '학생 미지정'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                    <span>{formatDate(item.class?.class_date || item.created_at)}</span>
                                                                </div>
                                                            </div>

                                                            {item.error_log && (
                                                                <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2">
                                                                    <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5" />
                                                                    <p className="text-xs text-rose-700 font-mono break-all">{item.error_log}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0 md:pl-6 md:border-l border-slate-100 w-full md:w-auto justify-end">
                                                            {item.youtube_url && (
                                                                <Button variant="outline" size="icon" asChild className="rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                                                                    <a href={item.youtube_url} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            {item.status === 'failed' && (
                                                                <Button variant="outline" size="icon" onClick={() => handleRetry(item.id)} className="rounded-xl hover:bg-slate-100 transition-all">
                                                                    <RefreshCcw className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <VideoUploadDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onSuccess={loadData}
            />
        </div>
    )
}
