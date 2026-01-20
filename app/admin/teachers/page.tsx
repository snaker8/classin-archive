'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, User, Search, Settings, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { getTeachers, createTeacher, deleteTeacher, updateTeacherAssignments } from '@/app/actions/teacher'
import { getGroups } from '@/app/actions/group'

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTeacherName, setNewTeacherName] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Assign State
    const [isAssignOpen, setIsAssignOpen] = useState(false)
    const [assigningTeacher, setAssigningTeacher] = useState<any>(null)
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [teachersRes, groupsRes] = await Promise.all([
            getTeachers(),
            getGroups()
        ])

        if (teachersRes.teachers) {
            setTeachers(teachersRes.teachers)
        }
        if (groupsRes.groups) {
            setGroups(groupsRes.groups)
        }
        setLoading(false)
    }

    async function handleCreate() {
        if (!newTeacherName) return
        setSubmitting(true)

        const res = await createTeacher(newTeacherName)
        if (res.success) {
            toast({ title: '선생님 등록 성공', description: `${newTeacherName} 선생님이 등록되었습니다.` })
            setNewTeacherName('')
            setIsCreateOpen(false)
            loadData()
        } else {
            toast({ title: '등록 실패', description: res.error, variant: 'destructive' })
        }
        setSubmitting(false)
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`정말 ${name} 선생님을 삭제하시겠습니까?`)) return

        const res = await deleteTeacher(id)
        if (res.success) {
            toast({ title: '삭제 성공', description: '선생님이 삭제되었습니다.' })
            loadData()
        } else {
            toast({ title: '삭제 실패', description: res.error, variant: 'destructive' })
        }
    }

    function openAssign(teacher: any) {
        setAssigningTeacher(teacher)
        // Set initially selected groups based on what is already assigned to this teacher
        const currentGroupIds = teacher.groups?.map((g: any) => g.id) || []
        setSelectedGroupIds(currentGroupIds)
        setIsAssignOpen(true)
    }

    function toggleGroupSelection(groupId: string) {
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        )
    }

    async function handleAssignSubmit() {
        if (!assigningTeacher) return
        setSubmitting(true)

        const res = await updateTeacherAssignments(assigningTeacher.id, selectedGroupIds)

        if (res.success) {
            toast({ title: '배정 완료', description: '담당 반 배정이 수정되었습니다.' })
            setIsAssignOpen(false)
            setAssigningTeacher(null)
            loadData()
        } else {
            toast({ title: '배정 실패', description: res.error, variant: 'destructive' })
        }
        setSubmitting(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">선생님 관리</h1>
                    <p className="text-muted-foreground">
                        선생님을 등록하고 반에 배정하여 수업 자료를 자동으로 분류합니다.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            선생님 등록
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>선생님 등록</DialogTitle>
                            <DialogDescription>
                                등록할 선생님의 성함을 입력하세요.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid items-center gap-4">
                                <Label htmlFor="name" className="text-left">
                                    선생님 성함
                                </Label>
                                <Input
                                    id="name"
                                    value={newTeacherName}
                                    onChange={(e) => setNewTeacherName(e.target.value)}
                                    placeholder="예: 김선생"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                            <Button onClick={handleCreate} disabled={submitting}>등록</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : teachers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    등록된 선생님이 없습니다.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teachers.map((teacher) => (
                        <Card key={teacher.id} className="relative group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-bold">
                                    {teacher.name}
                                </CardTitle>
                                <User className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground mb-4">
                                    등록일: {new Date(teacher.created_at).toLocaleDateString()}
                                </div>

                                <div className="mb-4">
                                    <div className="text-xs font-semibold mb-1 text-muted-foreground">담당 반 ({teacher.groups?.length || 0})</div>
                                    <div className="flex flex-wrap gap-1">
                                        {teacher.groups && teacher.groups.length > 0 ? (
                                            teacher.groups.map((g: any) => (
                                                <span key={g.id} className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium">
                                                    {g.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">배정된 반이 없습니다.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className=""
                                        onClick={() => openAssign(teacher)}
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        반 배정
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(teacher.id, teacher.name)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        삭제
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Assignment Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>담당 반 배정</DialogTitle>
                        <DialogDescription>
                            {assigningTeacher?.name} 선생님이 담당할 반을 선택하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                            {groups.map((group) => {
                                const isSelected = selectedGroupIds.includes(group.id)
                                // Show warning if group implies a conflict (assigned to someone else)
                                // logic: if group.teacher_id is set AND it's NOT this teacher AND we are selecting it
                                const assignedToOther = group.teacher_id && group.teacher_id !== assigningTeacher?.id

                                return (
                                    <div key={group.id} className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <Checkbox
                                            id={`group-${group.id}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleGroupSelection(group.id)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor={`group-${group.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {group.name}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                {group.description || '설명 없음'}
                                            </p>
                                            {assignedToOther && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    ⚠️ 현재 다른 선생님 담당입니다
                                                </p>
                                            )}
                                            {group.teacher_id === assigningTeacher?.id && (
                                                <p className="text-xs text-emerald-600 mt-1">
                                                    ✅ 현재 담당 중
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {groups.length === 0 && (
                                <div className="text-center text-muted-foreground py-4">
                                    생성된 반이 없습니다.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>취소</Button>
                        <Button onClick={handleAssignSubmit} disabled={submitting}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
