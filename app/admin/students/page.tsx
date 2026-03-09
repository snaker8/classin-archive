'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit, FileInput, Users, ChevronRight, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { getStudents, deleteStudents, deleteStudent } from '@/app/actions/student'
import { getCenters, Center } from '@/app/actions/center'
import { StudentEditDialog } from '@/components/admin/student-edit-dialog'
import { cn } from '@/lib/utils'

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
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Student Management</p>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">학생 관리</h1>
                    <p className="text-sm text-muted-foreground mt-1">전체 학생 목록을 조회하고 관리합니다</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => router.push('/admin/students/new')}
                        className="bg-primary hover:bg-primary/90 shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        학생 추가
                    </Button>
                    <Button
                        onClick={() => router.push('/admin/students/batch')}
                        variant="outline"
                    >
                        <FileInput className="h-4 w-4 mr-2" />
                        엑셀 등록
                    </Button>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {/* Card 1: Total Students */}
                <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Card className="bg-card border shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative">
                        <CardContent className="p-6">
                            <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="h-16 w-16 text-primary" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-4xl font-bold text-foreground mb-1">{students.length}</p>
                                <p className="text-xs text-muted-foreground font-medium">전체 학생</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 2: Active Groups */}
                <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Card className="bg-card border shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative">
                        <CardContent className="p-6">
                            <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <div className="h-12 w-12 rounded-lg bg-primary/20" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-4xl font-bold text-foreground mb-1">{allGroups.length}</p>
                                <p className="text-xs text-muted-foreground font-medium">활성 반</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 3: Filtered Results */}
                <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Card className="bg-card border shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative">
                        <CardContent className="p-6">
                            <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Search className="h-14 w-14 text-primary" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-4xl font-bold text-foreground mb-1">{filteredStudents.length}</p>
                                <p className="text-xs text-muted-foreground font-medium">검색 결과</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Table Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b">
                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
                            <div className="relative w-full lg:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="이름, 이메일, 전화번호 검색..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {allGroups.length > 0 && (
                                    <select
                                        value={selectedGroupFilter}
                                        onChange={(e) => setSelectedGroupFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg border bg-background text-sm"
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
                                    className="px-3 py-2 rounded-lg border bg-background text-sm"
                                >
                                    <option value="">모든 센터</option>
                                    {centers.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedHallFilter}
                                    onChange={(e) => setSelectedHallFilter(e.target.value)}
                                    className="px-3 py-2 rounded-lg border bg-background text-sm"
                                >
                                    <option value="">모든 관</option>
                                    {halls.map(h => (
                                        <option key={h.id} value={h.name}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap px-2">
                                총 {filteredStudents.length}명
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedIds.size > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="shrink-0"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                선택 삭제 ({selectedIds.size})
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Desktop Header */}
                        <div className="hidden md:grid grid-cols-[40px_1.5fr_1.5fr_1fr_1.5fr_100px] gap-4 p-4 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border"
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
                            <div className="p-12 text-center">
                                <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">로딩 중...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                <AnimatePresence mode="popLayout">
                                    {filteredStudents.map((student, idx) => (
                                        <motion.div
                                            key={student.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className={cn(
                                                "flex flex-col md:grid md:grid-cols-[40px_1.5fr_1.5fr_1fr_1.5fr_100px] gap-2 md:gap-4 p-4 items-start md:items-center text-sm transition-all group",
                                                selectedIds.has(student.id)
                                                    ? "bg-primary/5 border-l-2 border-l-primary"
                                                    : "hover:bg-muted/30"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-border"
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

                                            {/* Name */}
                                            <div className="flex flex-col min-w-0">
                                                <div
                                                    className="font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer truncate"
                                                    onClick={() => router.push(`/admin/students/${student.id}`)}
                                                >
                                                    {student.full_name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {student.user_metadata?.phone_number || '-'}
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="truncate text-muted-foreground text-xs" title={student.email}>
                                                {student.email}
                                            </div>

                                            {/* Center/Hall */}
                                            <div className="flex flex-wrap gap-1">
                                                {student.center && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                                                        {student.center}
                                                    </span>
                                                )}
                                                {student.hall && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                                        {student.hall}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Groups */}
                                            <div className="flex flex-wrap gap-1">
                                                {student.group_members && student.group_members.length > 0 ? (
                                                    student.group_members.map((gm: any) => (
                                                        <span key={gm.group?.id} className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                                            {gm.group?.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/50">-</span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="hidden md:flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
