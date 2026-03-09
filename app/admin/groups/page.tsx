'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Trash2, Pencil, Search, ChevronRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { getGroups, createGroup, deleteGroup, updateGroup } from '@/app/actions/group'
import { getTeachers } from '@/app/actions/teacher'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ClassesPage() {
    const router = useRouter()
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupDesc, setNewGroupDesc] = useState('')

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingGroup, setEditingGroup] = useState<any>(null)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')

    // Search State
    const [searchTerm, setSearchTerm] = useState('')

    // Teachers State
    const [teachers, setTeachers] = useState<any[]>([])
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
    const [editTeacherId, setEditTeacherId] = useState<string>('')

    // Filter State
    const [selectedGrade, setSelectedGrade] = useState<string>('ALL')
    const [availableGrades, setAvailableGrades] = useState<string[]>([])

    useEffect(() => {
        loadTeachers()
    }, [])

    async function loadTeachers() {
        const res = await getTeachers()
        if (res.teachers) {
            setTeachers(res.teachers)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            loadGroups()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    async function loadGroups() {
        setLoading(true)
        const res = await getGroups(searchTerm)
        if (res.groups) {
            setGroups(res.groups)
        }
        setLoading(false)
    }

    async function handleCreate() {
        if (!newGroupName) return;

        const res = await createGroup(newGroupName, newGroupDesc, selectedTeacherId || null)
        if (res.success) {
            setIsCreateOpen(false)
            setNewGroupName('')
            setNewGroupDesc('')
            setSelectedTeacherId('')
            loadGroups()
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    function openEdit(group: any) {
        setEditingGroup(group)
        setEditName(group.name)
        setEditDesc(group.description || '')
        setEditTeacherId(group.teacher_id || '')
        setIsEditOpen(true)
    }

    async function handleUpdate() {
        if (!editingGroup || !editName) return;

        const res = await updateGroup(editingGroup.id, editName, editDesc, editTeacherId || null)
        if (res.success) {
            setIsEditOpen(false)
            setEditingGroup(null)
            loadGroups()
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('정말 이 반을 삭제하시겠습니까? (소속 학생 데이터는 유지됩니다)')) return;

        const res = await deleteGroup(id)
        if (res.success) {
            loadGroups()
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    useEffect(() => {
        if (groups.length > 0) {
            const grades = new Set<string>()
            groups.forEach(g => {
                const schoolMatch = g.name.match(/^([초중고]\d+)/)
                if (schoolMatch) {
                    grades.add(schoolMatch[1])
                    return
                }
                const gradeMatch = g.name.match(/^(\d+학년)/)
                if (gradeMatch) {
                    grades.add(gradeMatch[1])
                    return
                }
                if (g.name.includes('학년')) {
                    const parts = g.name.split(' ')
                    const gradePart = parts.find((p: string) => p.includes('학년'))
                    if (gradePart) grades.add(gradePart)
                    else grades.add('기타')
                    return
                }
                grades.add('기타')
            })
            const sortedGrades = Array.from(grades).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true })
            )
            setAvailableGrades(sortedGrades)
        }
    }, [groups])

    const filteredGroups = selectedGrade === 'ALL'
        ? groups
        : groups.filter(g => {
            if (selectedGrade === '기타') {
                return !g.name.match(/^([초중고]\d+)/) && !g.name.includes('학년')
            }
            return g.name.startsWith(selectedGrade) || g.name.includes(selectedGrade)
        })

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
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Class Management</p>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">수업(반) 관리</h1>
                    <p className="text-sm text-muted-foreground mt-1">반을 생성하고 관리하며, 각 반의 수업 자료를 배포합니다</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            새 반 만들기
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 반 만들기</DialogTitle>
                            <DialogDescription>
                                새로운 반 이름을 입력하세요. (예: 월수금 A반)
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid items-center gap-2">
                                <Label htmlFor="name">반 이름</Label>
                                <Input
                                    id="name"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="예: 초등 기초반"
                                />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label htmlFor="desc">설명 (선택)</Label>
                                <Input
                                    id="desc"
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="간단한 설명..."
                                />
                            </div>
                            <div className="grid items-center gap-2">
                                <Label htmlFor="teacher">담임 선생님 (선택)</Label>
                                <select
                                    id="teacher"
                                    className="h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                >
                                    <option value="">선택 안 함</option>
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                            <Button onClick={handleCreate}>생성</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Filter Tabs */}
            {availableGrades.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 overflow-x-auto pb-2"
                >
                    <button
                        onClick={() => setSelectedGrade('ALL')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                            selectedGrade === 'ALL'
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                    >
                        전체
                    </button>
                    {availableGrades.map(grade => (
                        <button
                            key={grade}
                            onClick={() => setSelectedGrade(grade)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border whitespace-nowrap",
                                selectedGrade === grade
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            )}
                        >
                            {grade}
                        </button>
                    ))}
                </motion.div>
            )}

            {/* Search Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="relative max-w-sm"
            >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="반 이름 검색..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </motion.div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">로딩 중...</p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredGroups.map((group, idx) => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -4 }}
                            >
                                <Card
                                    className="bg-card border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                                    onClick={() => router.push(`/admin/groups/${group.id}`)}
                                >
                                    {/* Background decoration */}
                                    <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />

                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-lg font-bold truncate pr-8 text-foreground group-hover:text-primary transition-colors">
                                            {group.name}
                                        </CardTitle>
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-primary" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4 min-h-[1.25rem] line-clamp-1">
                                            {group.description || '설명 없음'}
                                        </p>
                                        {group.teacher && (
                                            <div className="text-xs font-medium text-emerald-700 mb-3 px-2 py-1 bg-emerald-50 rounded-md w-fit">
                                                👨‍🏫 {group.teacher.name} 선생님
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <div className="text-xs text-muted-foreground">
                                                학생 <span className="text-primary font-bold">{group.members?.[0]?.count || 0}</span>명
                                            </div>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    onClick={() => openEdit(group)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(group.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredGroups.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full text-center py-16"
                        >
                            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? '검색 결과가 없습니다.' : (selectedGrade !== 'ALL' ? '해당 학년의 반이 없습니다.' : '생성된 반이 없습니다.')}
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>반 정보 수정</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid items-center gap-2">
                            <Label htmlFor="edit-name">반 이름</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="grid items-center gap-2">
                            <Label htmlFor="edit-desc">설명</Label>
                            <Input
                                id="edit-desc"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                            />
                        </div>
                        <div className="grid items-center gap-2">
                            <Label htmlFor="edit-teacher">담임 선생님</Label>
                            <select
                                id="edit-teacher"
                                className="h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                value={editTeacherId}
                                onChange={(e) => setEditTeacherId(e.target.value)}
                            >
                                <option value="">선택 안 함</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
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
