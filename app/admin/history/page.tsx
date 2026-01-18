'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllClasses } from '@/app/actions/class' // Correct extraction
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Eye, FileText, Calendar, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function UploadHistoryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [classes, setClasses] = useState<any[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const pageSize = 10

    useEffect(() => {
        loadClasses()
    }, [page])

    const loadClasses = async (searchTerm = search) => {
        setLoading(true)
        try {
            const { classes, count, error } = await getAllClasses({ page, limit: pageSize, search: searchTerm })
            if (error) {
                alert(error)
                return
            }
            setClasses(classes || [])
            setTotalCount(count || 0)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        setPage(1)
        loadClasses(search)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        뒤로
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold">업로드 기록</h2>
                        <p className="text-muted-foreground">전체 학습자료 업로드 현황</p>
                    </div>
                </div>
            </div>

            <div className="flex space-x-2">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="수업 제목 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-8"
                    />
                </div>
                <Button onClick={handleSearch}>검색</Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">수업 제목</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">학생</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">자료 수</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">업로드 일시</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    <div className="flex justify-center mb-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    </div>
                                    로딩 중...
                                </td>
                            </tr>
                        ) : classes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    {search ? '검색 결과가 없습니다.' : '업로드된 기록이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            classes.map((cls) => (
                                <tr key={cls.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center font-medium">
                                            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                            {cls.title}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                            {cls.student?.full_name || '알 수 없음'}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {cls.materials?.[0]?.count || 0}개
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center text-muted-foreground">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {formatDate(cls.class_date)}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/viewer/${cls.id}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            보기
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="text-sm text-gray-500">
                    총 {totalCount}개 중 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} 표시
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        이전
                    </Button>
                    <div className="flex items-center px-2 text-sm font-medium">
                        {page} / {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages || loading}
                    >
                        다음
                    </Button>
                </div>
            </div>
        </div>
    )
}
