'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Search, FileText, Video, Link as LinkIcon, ExternalLink, Loader2, FileImage, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getStudentMaterials } from '@/app/actions/material'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    useEffect(() => {
        loadData()
    }, [page])

    async function loadData() {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                const res = await getStudentMaterials(session.user.id, page, 12)
                if (res.materials) {
                    setMaterials(res.materials)
                    setTotalPages(res.totalPages)
                    setTotalCount(res.total)
                }
            }
        } catch (error) {
            console.error('Error loading materials:', error)
        } finally {
            setLoading(false)
        }
    }

    const getTypeIcon = (type: string) => {
        if (type.includes('video')) return <Video className="h-5 w-5 text-rose-500" />
        if (type.includes('link')) return <LinkIcon className="h-5 w-5 text-blue-500" />
        if (type.includes('teacher')) return <FileImage className="h-5 w-5 text-violet-500" />
        return <FileText className="h-5 w-5 text-emerald-500" />
    }

    if (loading && page === 1) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/30 border"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full blur-3xl opacity-50" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Learning Archive</p>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        자료실
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        지금까지 업로드된 총 {totalCount}개의 학습 자료(영상/문서)를 한눈에 확인하세요
                    </p>
                </div>
            </motion.div>

            {materials.length === 0 && !loading ? (
                <Card className="p-12 text-center border-dashed">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">아직 등록된 자료가 없습니다.</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {materials.map((m, idx) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -4 }}
                            >
                                <Card className="overflow-hidden border hover:shadow-lg transition-all h-full flex flex-col">
                                    <div className="p-4 flex-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={cn(
                                                "p-2.5 rounded-xl bg-muted flex items-center justify-center",
                                                m.type.includes('video') ? "bg-rose-50" :
                                                    m.type.includes('teacher') ? "bg-violet-50" : "bg-emerald-50"
                                            )}>
                                                {getTypeIcon(m.type)}
                                            </div>
                                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                {formatDate(m.created_at)}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-foreground mb-1 line-clamp-2" title={m.title}>
                                            {m.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                            <BookOpen className="h-3 w-3" />
                                            {m.class?.title}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/30 border-t flex justify-end">
                                        <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                                            <a href={m.content_url} target="_blank" rel="noopener noreferrer">
                                                자료 보기
                                                <ExternalLink className="h-3 w-3 ml-1.5" />
                                            </a>
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                이전
                            </Button>
                            <span className="text-sm font-medium">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                다음
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
