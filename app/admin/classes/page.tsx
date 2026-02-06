'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Trash2, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getGroups, createGroup, deleteGroup, updateGroup } from '@/app/actions/group'
import { getTeachers } from '@/app/actions/teacher'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

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
        }, 300) // Debounce search
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
            // Extract grades
            const grades = new Set<string>()
            groups.forEach(g => {
                // 1. Try "중1", "고2", "초3" pattern at start
                const schoolMatch = g.name.match(/^([초중고]\d+)/)
                if (schoolMatch) {
                    grades.add(schoolMatch[1])
                    return
                }

                // 2. Try "1학년" pattern
                const gradeMatch = g.name.match(/^(\d+학년)/)
                if (gradeMatch) {
                    grades.add(gradeMatch[1])
                    return
                }

                // 3. Fallback: Check if '학년' exists anywhere
                if (g.name.includes('학년')) {
                    const parts = g.name.split(' ')
                    const gradePart = parts.find((p: string) => p.includes('학년'))
                    if (gradePart) grades.add(gradePart)
                    else grades.add('기타')
                    return
                }

                grades.add('기타')
            })
            // Natural sort grades
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
            // For "중1", "1학년" etc, check if name starts with it
            return g.name.startsWith(selectedGrade) || g.name.includes(selectedGrade)
        })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">수업(반) 관리</h1>
                    <p className="text-muted-foreground">
                        반을 생성하고 관리하며, 각 반의 수업 자료를 배포합니다.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
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
                            <div className="grid items-center gap-4">
                                <Label htmlFor="name" className="text-left">
                                    반 이름
                                </Label>
                                <Input
                                    id="name"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="예: 초등 기초반"
                                />
                            </div>
                            <div className="grid items-center gap-4">
                                <Label htmlFor="desc" className="text-left">
                                    설명 (선택)
                                </Label>
                                <Input
                                    id="desc"
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="간단한 설명..."
                                />
                            </div>
                            <div className="grid items-center gap-4">
                                <Label htmlFor="teacher" className="text-left">
                                    담임 선생님 (선택)
                                </Label>
                                <select
                                    id="teacher"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>

            {/* Filter Tabs */}
            {availableGrades.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Badge
                        variant={selectedGrade === 'ALL' ? 'default' : 'outline'}
                        className="cursor-pointer text-sm py-1.5 px-4"
                        onClick={() => setSelectedGrade('ALL')}
                    >
                        전체
                    </Badge>
                    {availableGrades.map(grade => (
                        <Badge
                            key={grade}
                            variant={selectedGrade === grade ? 'default' : 'outline'}
                            className="cursor-pointer text-sm py-1.5 px-4"
                            onClick={() => setSelectedGrade(grade)}
                        >
                            {grade}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Search Bar */}
            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="반 이름 검색..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredGroups.map((group) => (
                        <Card key={group.id} className="hover:shadow-lg transition-all cursor-pointer relative group border-indigo-50 hover:border-indigo-200" onClick={() => router.push(`/admin/groups/${group.id}`)}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-heading font-bold truncate pr-8 text-indigo-950">
                                    {group.name}
                                </CardTitle>
                                <Users className="h-4 w-4 text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-muted-foreground mb-4 min-h-[1.25rem]">
                                    {group.description || '설명 없음'}
                                </div>
                                {group.teacher && (
                                    <div className="text-sm font-medium text-emerald-600 mb-2 p-1 bg-emerald-50 rounded w-fit px-2">
                                        👨‍🏫 {group.teacher.name} 선생님
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed">
                                    <div className="text-xs text-muted-foreground font-medium">
                                        학생 <span className="text-indigo-600 font-bold">{group.members?.[0]?.count || 0}</span>명
                                    </div>

                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                            onClick={() => openEdit(group)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(group.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredGroups.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50/50">
                            {searchTerm ? '검색 결과가 없습니다.' : (selectedGrade !== 'ALL' ? '해당 학년의 반이 없습니다.' : '생성된 반이 없습니다.')}
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>반 정보 수정</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid items-center gap-4">
                            <Label htmlFor="edit-name" className="text-left">
                                반 이름
                            </Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="grid items-center gap-4">
                            <Label htmlFor="edit-desc" className="text-left">
                                설명
                            </Label>
                            <Input
                                id="edit-desc"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                            />
                        </div>
                        <div className="grid items-center gap-4">
                            <Label htmlFor="edit-teacher" className="text-left">
                                담임 선생님
                            </Label>
                            <select
                                id="edit-teacher"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
