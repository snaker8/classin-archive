'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStudentDetails } from '@/app/actions/student'
import { deleteClass } from '@/app/actions/class'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft, BookOpen, Trash2, Calendar as CalendarIcon, Search, Eye } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ClassEditDialog } from '@/components/admin/class-edit-dialog'

export default function StudentDetailView() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [student, setStudent] = useState<any>(null)
    const [classes, setClasses] = useState<any[]>([])
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
                // Reload data
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

    // Process classes for timeline
    const timelineData = useMemo(() => {
        let filtered = [...classes]

        // Class Filter (반 필터)
        if (selectedClass) {
            filtered = filtered.filter(c => c.title === selectedClass)
        }

        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(query) ||
                (c.description && c.description.toLowerCase().includes(query))
            )
        }

        // Date Filter
        if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            filtered = filtered.filter(c => c.class_date === dateStr)
        }

        // Group by Date
        const grouped: Record<string, any[]> = {}
        filtered.forEach(cls => {
            const date = cls.class_date
            if (!grouped[date]) grouped[date] = []
            grouped[date].push(cls)
        })

        // Sort Dates Descending
        return Object.entries(grouped).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    }, [classes, searchQuery, selectedDate, selectedClass])

    // Dates that have classes for Calendar
    const classDates = useMemo(() => {
        return new Set(classes.map(c => c.class_date))
    }, [classes])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!student) {
        return <div>학생 정보를 찾을 수 없습니다.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    돌아가기
                </Button>
                <div>
                    <h2 className="text-3xl font-bold">{student.full_name}</h2>
                    <p className="text-muted-foreground">{student.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Filters */}
                <Card className="lg:col-span-1 h-fit sticky top-6">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <CalendarIcon className="h-5 w-5 mr-2" />
                            날짜별 보기
                        </CardTitle>
                        <CardDescription>
                            날짜를 선택하여 {student.full_name} 학생의 자료를 확인하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="수업 제목 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Class Filter (반 필터) */}
                        {uniqueClassTitles.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">반 필터</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-white text-sm"
                                >
                                    <option value="">모든 반</option>
                                    {uniqueClassTitles.map(title => (
                                        <option key={title} value={title}>{title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-center border rounded-md p-4">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                modifiers={{ hasClass: (date) => classDates.has(format(date, 'yyyy-MM-dd')) }}
                                modifiersClassNames={{ hasClass: 'has-class-day' }}
                                locale={ko}
                            />
                        </div>

                        {(selectedDate || selectedClass) && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSelectedDate(undefined)
                                    setSelectedClass('')
                                }}
                            >
                                필터 초기화
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">학습 기록</h3>
                        <span className="text-sm text-muted-foreground">총 {classes.length}개의 수업</span>
                    </div>

                    {timelineData.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                                <p>해당 조건의 수업 기록이 없습니다.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {timelineData.map(([date, classList]) => (
                                <div key={date} className="relative pl-6 border-l-2 border-gray-200">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />

                                    <h4 className="text-lg font-bold mb-4 text-primary">
                                        {format(parseISO(date), 'yyyy년 M월 d일 (eee)', { locale: ko })}
                                    </h4>

                                    <div className="space-y-4">
                                        {classList.map((cls: any) => (
                                            <Card key={cls.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                                <CardContent className="p-0">
                                                    <div className="flex flex-col sm:flex-row">
                                                        {/* Info */}
                                                        <div className="flex-1 p-4 sm:p-5">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <h5 className="font-semibold text-lg mb-1">{cls.title}</h5>
                                                                    {cls.description && (
                                                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                                            {cls.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                                                <span className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                                                    <BookOpen className="h-3 w-3 mr-1" />
                                                                    자료 {(cls.materials?.some((m: any) => m.type === 'blackboard_image') ? 1 : 0) + (cls.materials?.filter((m: any) => m.type === 'video_link').length || 0)}개
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {format(parseISO(cls.created_at), 'HH:mm')} 업로드됨
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l bg-gray-50 divide-x sm:divide-x-0 sm:divide-y divide-gray-200">
                                                            <Button
                                                                variant="ghost"
                                                                className="flex-1 rounded-none px-4 py-3 h-auto sm:py-0 hover:bg-blue-50 hover:text-blue-600"
                                                                onClick={() => window.open(`/viewer/${cls.id}`, '_blank')}
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                보기
                                                            </Button>
                                                            <ClassEditDialog
                                                                cls={cls}
                                                                onSuccess={() => loadData(params.id as string)}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                className="flex-1 rounded-none px-4 py-3 h-auto sm:py-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                                onClick={() => handleDeleteClass(cls.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                삭제
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
