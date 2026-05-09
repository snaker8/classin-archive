'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, ChevronRight, UserPlus, Pencil, MonitorPlay, UserMinus, RotateCcw, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { getStudents, createStudent, updateStudent, withdrawStudent, restoreStudent } from '@/app/actions/student'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

export default function TeacherStudentManagementPage() {
    const router = useRouter()
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('')
    const [allGroups, setAllGroups] = useState<string[]>([])
    const [tab, setTab] = useState<'active' | 'withdrawn'>('active')
    const [withdrawnCount, setWithdrawnCount] = useState(0)
    const [activeCount, setActiveCount] = useState(0)
    const [busyId, setBusyId] = useState<string | null>(null)

    // Create Student
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newPhone, setNewPhone] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newName, setNewName] = useState('')
    const [newGrade, setNewGrade] = useState('')
    const [newSchool, setNewSchool] = useState('')
    const [newParentPhone, setNewParentPhone] = useState('')

    // Edit Student
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [editName, setEditName] = useState('')
    const [editGrade, setEditGrade] = useState('')
    const [editSchool, setEditSchool] = useState('')
    const [editParentPhone, setEditParentPhone] = useState('')

    useEffect(() => {
        loadData()
    }, [tab])

    async function loadData() {
        setLoading(true)
        const res = await getStudents(tab)
        if (res.students) {
            setStudents(res.students)
            const groups = new Set<string>()
            res.students.forEach((s: any) => {
                s.group_members?.forEach((gm: any) => {
                    if (gm.group?.name) groups.add(gm.group.name)
                })
            })
            setAllGroups(Array.from(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
        }
        setLoading(false)

        // 양쪽 탭 카운트 갱신 (가벼운 카운트만 따로)
        const [activeRes, withdrawnRes] = await Promise.all([
            getStudents('active'),
            getStudents('withdrawn'),
        ])
        setActiveCount(activeRes.students?.length || 0)
        setWithdrawnCount(withdrawnRes.students?.length || 0)
    }

    async function handleWithdraw(student: any) {
        if (!confirm(`${student.full_name} 학생을 퇴원 처리하시겠습니까?\n\n학생의 자료는 그대로 보존되며, [퇴원생 관리] 탭에서 언제든 복원 가능합니다.`)) return
        setBusyId(student.id)
        const res = await withdrawStudent(student.id)
        setBusyId(null)
        if (res.success) {
            toast({ title: '퇴원 처리됨', description: `${student.full_name} 학생이 퇴원생으로 분류되었습니다.` })
            loadData()
        } else {
            toast({ title: '퇴원 처리 실패', description: res.error, variant: 'destructive' })
        }
    }

    async function handleRestore(student: any) {
        if (!confirm(`${student.full_name} 학생을 복원하시겠습니까?\n\n[활성 학생] 탭으로 다시 이동되며 모든 기능이 복구됩니다.`)) return
        setBusyId(student.id)
        const res = await restoreStudent(student.id)
        setBusyId(null)
        if (res.success) {
            toast({ title: '복원됨', description: `${student.full_name} 학생이 활성 상태로 복원되었습니다.` })
            loadData()
        } else {
            toast({ title: '복원 실패', description: res.error, variant: 'destructive' })
        }
    }

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase())

        let matchesGroup = true
        if (selectedGroupFilter) {
            const studentGroups = student.group_members?.map((gm: any) => gm.group?.name) || []
            matchesGroup = studentGroups.includes(selectedGroupFilter)
        }

        return matchesSearch && matchesGroup
    })

    function openEdit(student: any) {
        setEditingStudent(student)
        setEditName(student.full_name || '')
        setEditGrade(student.grade || '')
        setEditSchool(student.school || '')
        setEditParentPhone(student.parent_phone || '')
        setIsEditOpen(true)
    }

    async function handleUpdate() {
        if (!editingStudent) return
        const res = await updateStudent(editingStudent.id, {
            fullName: editName,
            grade: editGrade,
            school: editSchool,
            parentPhone: editParentPhone,
        })
        if (res.success) {
            setIsEditOpen(false)
            setEditingStudent(null)
            loadData()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="flex flex-col max-w-[1300px] mx-auto p-8 md:p-12 gap-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Student Management</p>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">학생 관리</h1>
                    <p className="text-muted-foreground text-base mt-2">학생 정보를 조회하고 수정합니다.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-sm">
                            <Plus className="h-4 w-4 mr-2" />
                            학생 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 학생 추가</DialogTitle>
                            <DialogDescription>학생 정보를 입력하세요.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid items-center gap-2">
                                <Label>전화번호 (로그인 ID)</Label>
                                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01012345678" />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label>비밀번호</Label>
                                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="초기 비밀번호" />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label>이름</Label>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="학생 이름" />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label>학년 (선택)</Label>
                                <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="예: 중1" />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label>학교 (선택)</Label>
                                <Input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder="학교명" />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label>학부모 전화번호 (선택)</Label>
                                <Input value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} placeholder="01012345678" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                            <Button disabled={creating} onClick={async () => {
                                if (!newPhone || !newPassword || !newName) { alert('전화번호, 비밀번호, 이름은 필수입니다.'); return }
                                setCreating(true)
                                const formData = new FormData()
                                formData.set('phoneNumber', newPhone)
                                formData.set('password', newPassword)
                                formData.set('fullName', newName)
                                formData.set('grade', newGrade)
                                formData.set('school', newSchool)
                                formData.set('parentPhone', newParentPhone)
                                const res = await createStudent(null, formData)
                                setCreating(false)
                                if (res.success) {
                                    setIsCreateOpen(false)
                                    setNewPhone(''); setNewPassword(''); setNewName(''); setNewGrade(''); setNewSchool(''); setNewParentPhone('')
                                    loadData()
                                } else {
                                    alert(res.error)
                                }
                            }}>
                                {creating ? '등록 중...' : '학생 등록'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    onClick={() => setTab('active')}
                    className={cn(
                        'px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px',
                        tab === 'active'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    활성 학생
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {activeCount}
                    </span>
                </button>
                <button
                    onClick={() => setTab('withdrawn')}
                    className={cn(
                        'px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px flex items-center gap-1.5',
                        tab === 'withdrawn'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    <UserX className="h-3.5 w-3.5" />
                    퇴원생 관리
                    <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                        withdrawnCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                    )}>
                        {withdrawnCount}
                    </span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="border">
                    <CardContent className="p-5">
                        <p className="text-3xl font-black text-foreground">{filteredStudents.length}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                            {tab === 'active' ? '검색 결과 (활성)' : '검색 결과 (퇴원생)'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardContent className="p-5">
                        <p className="text-3xl font-black text-foreground">{allGroups.length}</p>
                        <p className="text-xs text-muted-foreground font-medium">소속 반 종류</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="이름 검색..." className="pl-10 h-11 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {allGroups.length > 0 && (
                    <select
                        value={selectedGroupFilter}
                        onChange={(e) => setSelectedGroupFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border bg-background text-sm h-11"
                    >
                        <option value="">모든 반</option>
                        {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                )}
            </div>

            {/* Student List */}
            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {filteredStudents.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                            >
                                <Card
                                    className={cn(
                                        "border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer rounded-2xl",
                                        tab === 'withdrawn' && "bg-muted/30 border-dashed"
                                    )}
                                    onClick={() => window.open(`/student/dashboard?studentId=${student.id}`, '_blank')}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm",
                                                tab === 'withdrawn' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                                            )}>
                                                {student.full_name?.slice(0, 1)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-foreground">{student.full_name}</p>
                                                    {tab === 'withdrawn' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">퇴원</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {student.grade && <span className="text-xs text-muted-foreground">{student.grade}</span>}
                                                    {student.school && <span className="text-xs text-muted-foreground">| {student.school}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {student.group_members && student.group_members.length > 0 && (
                                                <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
                                                    {student.group_members.slice(0, 3).map((gm: any, i: number) => (
                                                        gm.group && (
                                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                                                {gm.group.name}
                                                            </span>
                                                        )
                                                    ))}
                                                    {student.group_members.length > 3 && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                                            +{student.group_members.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                title="정보 수정"
                                                onClick={(e) => { e.stopPropagation(); openEdit(student) }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {tab === 'active' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                                    title="퇴원 처리"
                                                    disabled={busyId === student.id}
                                                    onClick={(e) => { e.stopPropagation(); handleWithdraw(student) }}
                                                >
                                                    <UserMinus className="h-3.5 w-3.5" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                                    title="복원"
                                                    disabled={busyId === student.id}
                                                    onClick={(e) => { e.stopPropagation(); handleRestore(student) }}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <MonitorPlay className="h-4 w-4 text-primary/60" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredStudents.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed rounded-3xl">
                            <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="font-bold text-muted-foreground">
                                {searchQuery
                                    ? '검색 결과가 없습니다.'
                                    : tab === 'active'
                                        ? '등록된 활성 학생이 없습니다.'
                                        : '퇴원생이 없습니다.'}
                            </p>
                            {tab === 'withdrawn' && !searchQuery && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    [활성 학생] 탭에서 퇴원 처리한 학생이 여기에 표시됩니다.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>학생 정보 수정</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid items-center gap-2">
                            <Label>이름</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid items-center gap-2">
                            <Label>학년</Label>
                            <Input value={editGrade} onChange={(e) => setEditGrade(e.target.value)} placeholder="예: 중1" />
                        </div>
                        <div className="grid items-center gap-2">
                            <Label>학교</Label>
                            <Input value={editSchool} onChange={(e) => setEditSchool(e.target.value)} />
                        </div>
                        <div className="grid items-center gap-2">
                            <Label>학부모 전화번호</Label>
                            <Input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} placeholder="01012345678" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>취소</Button>
                        <Button onClick={handleUpdate}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
