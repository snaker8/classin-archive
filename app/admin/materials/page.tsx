'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Search, FileText, Video, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAllMaterials, deleteMaterials } from '@/app/actions/material'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

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
    }, [page, search]) // Reload when page or search changes

    // Debounce search could be better, but simple effect is fine for admin

    async function loadData() {
        setLoading(true)
        const res = await getAllMaterials(page, 20, search)
        if (res.materials) {
            setMaterials(res.materials)
            setTotalPages(res.totalPages)
            setTotalCount(res.total)
            // Clear selection on page change to avoid phantom deletes? 
            // Or keep them? Let's clear for safety.
            // actually keeping them is better UX but harder to manage visually if not seen.
            // Let's clear.
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
        // optimistically update? No, wait for result.
        const res = await deleteMaterials(Array.from(selectedIds))
        if (res.success) {
            alert('삭제되었습니다.')
            setSelectedIds(new Set())
            loadData() // Refresh
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

    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">전체 자료 관리</h1>
                    <p className="text-muted-foreground">시스템에 업로드된 모든 수업 자료를 관리합니다.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="자료 제목 검색..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1) // Reset to page 1 on search
                                }}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground ml-2">
                            총 {totalCount}개
                        </div>
                    </div>
                    {selectedIds.size > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            선택 삭제 ({selectedIds.size})
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr_100px_60px] gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={selectedIds.size === materials.length && materials.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </div>
                            <div>자료 정보</div>
                            <div>수업 (Class)</div>
                            <div>학생</div>
                            <div>등록일</div>
                            <div>관리</div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground">로딩 중...</div>
                        ) : materials.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">자료가 없습니다.</div>
                        ) : (
                            materials.map(material => (
                                <div key={material.id} className={`grid grid-cols-[40px_1fr_1fr_1fr_100px_60px] gap-4 p-4 border-b last:border-0 items-center text-sm hover:bg-muted/20 transition-colors ${selectedIds.has(material.id) ? 'bg-blue-50/50' : ''}`}>
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={selectedIds.has(material.id)}
                                            onChange={() => toggleSelect(material.id)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                            {material.type.includes('video') ? <Video className="h-4 w-4" /> :
                                                material.type.includes('link') ? <LinkIcon className="h-4 w-4" /> :
                                                    <FileText className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate" title={material.title}>{material.title}</div>
                                            <div className="text-xs text-muted-foreground truncate opacity-70 flex items-center gap-1">
                                                {material.type}
                                                {material.content_url && (
                                                    <a href={material.content_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="truncate text-muted-foreground" title={material.class?.title}>
                                        {material.class?.title || '-'}
                                    </div>
                                    <div className="truncate text-muted-foreground">
                                        {material.class?.student?.full_name || '-'}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {formatDate(material.created_at)}
                                    </div>
                                    <div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(material.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                이전
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                            >
                                다음
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
