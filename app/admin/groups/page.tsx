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
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function GroupsPage() {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">반 관리</h1>
                    <p className="text-muted-foreground">
                        학생들을 그룹(반)으로 묶어 관리하고 자료를 자동 배포합니다.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
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
                    {groups.map((group) => (
                        <Card key={group.id} className="hover:shadow-md transition-shadow cursor-pointer relative group" onClick={() => router.push(`/admin/groups/${group.id}`)}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-bold truncate pr-8">
                                    {group.name}
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-muted-foreground mb-4 min-h-[1.25rem]">
                                    {group.description || '설명 없음'}
                                </div>
                                {group.teacher && (
                                    <div className="text-sm font-medium text-emerald-600 mb-2">
                                        👨‍🏫 {group.teacher.name} 선생님
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="text-xs text-muted-foreground">
                                        학생 {group.members?.[0]?.count || 0}명
                                    </div>

                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
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

                    {groups.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            {searchTerm ? '검색 결과가 없습니다.' : '생성된 반이 없습니다.'}
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
