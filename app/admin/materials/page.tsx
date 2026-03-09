'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Search, FileText, Video, Link as LinkIcon, ExternalLink, FolderOpen, Loader2, FileImage, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAllMaterials, deleteMaterials } from '@/app/actions/material'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function MaterialsPage() {
    const router = useRouter()
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadData()
    }, [page, search])

    async function loadData() {
        setLoading(true)
        const res = await getAllMaterials(page, 20, search)
        if (res.materials) {
            setMaterials(res.materials)
            setTotalPages(res.totalPages)
            setTotalCount(res.total)
            setSelectedIds(new Set())
        }
        setLoading(false)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === materials.length && materials.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(materials.map(m => m.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return
        if (!confirm(`선택한 ${selectedIds.size}개의 자료를 영구 삭제하시겠습니까?`)) return

        setLoading(true)
        const res = await deleteMaterials(Array.from(selectedIds))
        if (res.success) {
            alert('삭제되었습니다.')
            setSelectedIds(new Set())
            loadData()
        } else {
            alert(res.error)
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('이 자료를 삭제하시겠습니까?')) return
        const res = await deleteMaterials([id])
        if (res.success) {
            loadData()
        } else {
            alert(res.error)
        }
    }

    const getTypeIcon = (type: string) => {
        if (type.includes('video')) return <Video className="h-4 w-4 text-rose-500" />
        if (type.includes('link')) return <LinkIcon className="h-4 w-4 text-blue-500" />
        if (type.includes('teacher')) return <FileImage className="h-4 w-4 text-violet-500" />
        return <FileText className="h-4 w-4 text-emerald-500" />
    }

    const getTypeBadge = (type: string) => {
        if (type.includes('video')) return { text: '영상', bg: 'bg-rose-50', color: 'text-rose-600' }
        if (type.includes('teacher')) return { text: '선생님 판서', bg: 'bg-violet-50', color: 'text-violet-600' }
        if (type.includes('blackboard')) return { text: '학생 판서', bg: 'bg-emerald-50', color: 'text-emerald-600' }
        return { text: '기타', bg: 'bg-slate-50', color: 'text-slate-600' }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="shrink-0">
                            <Link href="/admin/dashboard">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                <FolderOpen className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">전체 자료 관리</h1>
                                <p className="text-sm text-muted-foreground">시스템에 업로드된 모든 수업 자료를 관리합니다.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <Card className="border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">전체 자료</p>
                                <p className="text-xl font-bold">{totalCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-50">
                                <FileImage className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">현재 페이지</p>
                                <p className="text-xl font-bold">{materials.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50">
                                <Search className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">검색어</p>
                                <p className="text-xl font-bold truncate">{search || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rose-50">
                                <Trash2 className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">선택됨</p>
                                <p className="text-xl font-bold">{selectedIds.size}</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border">
                        <CardHeader className="border-b bg-muted/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="자료 제목 검색..."
                                        className="pl-10 bg-white"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value)
                                            setPage(1)
                                        }}
                                    />
                                </div>
                                {selectedIds.size > 0 && (
                                    <Button variant="destructive" onClick={handleBulkDelete} className="shrink-0">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        선택 삭제 ({selectedIds.size})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Table Header */}
                            <div className="hidden md:grid grid-cols-[40px_1fr_1fr_1fr_100px_60px] gap-4 p-4 border-b bg-muted/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={selectedIds.size === materials.length && materials.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </div>
                                <div>자료 정보</div>
                                <div>수업</div>
                                <div>학생</div>
                                <div>등록일</div>
                                <div>관리</div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : materials.length === 0 ? (
                                <div className="py-20 text-center">
                                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">자료가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {materials.map((material, idx) => {
                                        const typeBadge = getTypeBadge(material.type)
                                        return (
                                            <motion.div
                                                key={material.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={cn(
                                                    "grid grid-cols-1 md:grid-cols-[40px_1fr_1fr_1fr_100px_60px] gap-4 p-4 items-center text-sm hover:bg-muted/30 transition-colors",
                                                    selectedIds.has(material.id) && "bg-primary/5"
                                                )}
                                            >
                                                <div className="hidden md:flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300"
                                                        checked={selectedIds.has(material.id)}
                                                        onChange={() => toggleSelect(material.id)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="md:hidden">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300"
                                                            checked={selectedIds.has(material.id)}
                                                            onChange={() => toggleSelect(material.id)}
                                                        />
                                                    </div>
                                                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                        {getTypeIcon(material.type)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium truncate" title={material.title}>
                                                            {material.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", typeBadge.bg, typeBadge.color)}>
                                                                {typeBadge.text}
                                                            </span>
                                                            {material.content_url && (
                                                                <a href={material.content_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="truncate text-muted-foreground hidden md:block" title={material.class?.title}>
                                                    {material.class?.title || '-'}
                                                </div>
                                                <div className="truncate text-muted-foreground hidden md:block">
                                                    {material.class?.student?.full_name || '-'}
                                                </div>
                                                <div className="text-muted-foreground text-xs hidden md:block">
                                                    {formatDate(material.created_at)}
                                                </div>
                                                <div className="flex justify-end md:justify-start">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(material.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 p-4 border-t bg-muted/10">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || loading}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        이전
                                    </Button>
                                    <div className="flex items-center gap-1 px-3">
                                        <span className="font-medium text-foreground">{page}</span>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-muted-foreground">{totalPages}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages || loading}
                                    >
                                        다음
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
