'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit, FileInput, FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getStudents, deleteStudents, deleteStudent } from '@/app/actions/student'
import { getCenters, Center } from '@/app/actions/center'
import { StudentEditDialog } from '@/components/admin/student-edit-dialog'

export default function StudentManagementPage() {
    const router = useRouter()
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('')
    const [selectedCenterFilter, setSelectedCenterFilter] = useState('')
    const [selectedHallFilter, setSelectedHallFilter] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [allGroups, setAllGroups] = useState<string[]>([])
    const [availableCenters, setAvailableCenters] = useState<Center[]>([])

    useEffect(() => {
        loadData()
        loadCenters()
    }, [])

    async function loadCenters() {
        const res = await getCenters()
        if (res.centers) {
            setAvailableCenters(res.centers)
        }
    }

    async function loadData() {
        setLoading(true)
        const res = await getStudents()
        if (res.students) {
            setStudents(res.students)

            const groups = new Set<string>()
            res.students.forEach((s: any) => {
                s.group_members?.forEach((gm: any) => {
                    if (gm.group?.name) groups.add(gm.group.name)
                })
            })
            setAllGroups(Array.from(groups).sort())
        }
        setLoading(false)
        setSelectedIds(new Set())
    }

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.user_metadata?.phone_number && student.user_metadata.phone_number.includes(searchQuery))

        let matchesGroup = true
        if (selectedGroupFilter) {
            const studentGroups = student.group_members?.map((gm: any) => gm.group?.name) || []
            matchesGroup = studentGroups.includes(selectedGroupFilter)
        }

        let matchesCenter = true
        if (selectedCenterFilter) {
            matchesCenter = student.center === selectedCenterFilter
        }

        let matchesHall = true
        if (selectedHallFilter) {
            // Check if student has hall property or check compatibility
            // existing students might not have hall.
            matchesHall = student.hall === selectedHallFilter
        }

        return matchesSearch && matchesGroup && matchesCenter && matchesHall
    })

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredStudents.map(s => s.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`선택한 ${selectedIds.size}명의 학생을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) return

        setLoading(true)
        const res = await deleteStudents(Array.from(selectedIds))
        if (res.success) {
            alert('삭제되었습니다.')
            loadData()
        } else {
            alert(res.error)
            setLoading(false)
        }
    }

    const centers = availableCenters.filter(c => c.type === 'center')
    const halls = availableCenters.filter(c => c.type === 'hall')

    return (
        <div className="space-y-6 container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-foreground">학생 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        전체 학생 목록을 조회하고 관리합니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => router.push('/admin/students/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
                        <Plus className="h-4 w-4 mr-2" />
                        학생 추가
                    </Button>
                    <Button onClick={() => router.push('/admin/students/batch')} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <FileInput className="h-4 w-4 mr-2" />
                        엑셀 일괄 등록
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 space-y-0 pb-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
                        <div className="relative w-full lg:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="이름, 이메일, 전화번호 검색..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {allGroups.length > 0 && (
                                <select
                                    value={selectedGroupFilter}
                                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                                    className="p-2 border rounded-md bg-white text-sm h-10 flex-1 sm:w-32"
                                >
                                    <option value="">모든 반</option>
                                    {allGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={selectedCenterFilter}
                                onChange={(e) => setSelectedCenterFilter(e.target.value)}
                                className="p-2 border rounded-md bg-white text-sm h-10 flex-1 sm:w-32"
                            >
                                <option value="">모든 센터</option>
                                {centers.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={selectedHallFilter}
                            onChange={(e) => setSelectedHallFilter(e.target.value)}
                            className="p-2 border rounded-md bg-white text-sm h-10 w-full sm:w-32"
                        >
                            <option value="">모든 관</option>
                            {halls.map(h => (
                                <option key={h.id} value={h.name}>{h.name}</option>
                            ))}
                        </select>
                        <div className="text-sm text-muted-foreground whitespace-nowrap px-1">
                            총 {filteredStudents.length}명
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                            <Button variant="destructive" onClick={handleBulkDelete} className="w-full lg:w-auto">
                                <Trash2 className="h-4 w-4 mr-2" />
                                선택 삭제 ({selectedIds.size})
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    <div className="rounded-md border overflow-hidden">
                        {/* Desktop Header */}
                        <div className="hidden md:grid grid-cols-[40px_1.5fr_1.5fr_1fr_1.5fr_100px] gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </div>
                            <div>이름 / 연락처</div>
                            <div>이메일 (ID)</div>
                            <div>센터 / 관</div>
                            <div>소속 반</div>
                            <div className="text-center">관리</div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground">로딩 중...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">검색 결과가 없습니다.</div>
                        ) : (
                            <div className="divide-y">
                                {filteredStudents.map(student => (
                                    <div key={student.id} className={`flex flex-col md:grid md:grid-cols-[40px_1.5fr_1.5fr_1fr_1.5fr_100px] gap-2 md:gap-4 p-4 items-start md:items-center text-sm hover:bg-muted/20 transition-colors ${selectedIds.has(student.id) ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={selectedIds.has(student.id)}
                                                onChange={() => toggleSelect(student.id)}
                                            />
                                            <div className="md:hidden flex items-center gap-1">
                                                <StudentEditDialog
                                                    student={student}
                                                    onSuccess={loadData}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={async () => {
                                                        if (confirm(`'${student.full_name}' 학생을 삭제하시겠습니까?`)) {
                                                            const res = await deleteStudent(student.id)
                                                            if (res.success) loadData()
                                                            else alert(res.error)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="font-bold md:font-medium text-base md:text-sm hover:underline cursor-pointer text-primary truncate" onClick={() => router.push(`/admin/students/${student.id}`)}>
                                                {student.full_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {student.user_metadata?.phone_number || '-'}
                                            </div>
                                        </div>

                                        <div className="truncate text-muted-foreground w-full md:w-auto" title={student.email}>
                                            <span className="md:hidden font-medium text-foreground mr-2">ID:</span>
                                            {student.email}
                                        </div>

                                        <div className="w-full md:w-auto">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                <span className="md:hidden font-medium text-foreground mr-1">소속:</span>
                                                {student.center ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-xs font-medium bg-slate-100 text-slate-800">
                                                        {student.center}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                                {student.hall && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-xs font-medium bg-violet-100 text-violet-800">
                                                        {student.hall}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                <span className="md:hidden font-medium text-foreground mr-1">반:</span>
                                                {student.group_members && student.group_members.length > 0 ? (
                                                    student.group_members.map((gm: any) => (
                                                        <span key={gm.group?.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-xs font-medium bg-indigo-100 text-indigo-800">
                                                            {gm.group?.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center justify-center gap-1">
                                            <StudentEditDialog
                                                student={student}
                                                onSuccess={loadData}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={async () => {
                                                    if (confirm(`'${student.full_name}' 학생을 삭제하시겠습니까?`)) {
                                                        const res = await deleteStudent(student.id)
                                                        if (res.success) loadData()
                                                        else alert(res.error)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
