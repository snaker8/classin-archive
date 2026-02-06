'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, User, Search, Settings, Check, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { getTeachers, createTeacher, deleteTeacher, updateTeacherAssignments } from '@/app/actions/teacher'
import { promoteToManager } from '@/app/actions/auth-admin'
import { getCurrentProfile } from '@/lib/supabase/client'
import { getGroups } from '@/app/actions/group'
import { TeacherEditDialog } from '@/components/admin/teacher-edit-dialog'

export default function TeachersPage() {
    const router = useRouter()
    const [teachers, setTeachers] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentProfile, setCurrentProfile] = useState<any>(null)

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTeacherName, setNewTeacherName] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Assign State
    const [isAssignOpen, setIsAssignOpen] = useState(false)
    const [assigningTeacher, setAssigningTeacher] = useState<any>(null)
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

    const [selectedCenterFilter, setSelectedCenterFilter] = useState('')
    const [selectedHallFilter, setSelectedHallFilter] = useState('')
    const [availableCenters, setAvailableCenters] = useState<any[]>([])

    useEffect(() => {
        const init = async () => {
            const profile = await getCurrentProfile()
            setCurrentProfile(profile)
            loadData()
            loadCenters()
        }
        init()
    }, [])

    async function loadCenters() {
        const { getCenters } = await import('@/app/actions/center')
        const res = await getCenters()
        if (res.centers) {
            setAvailableCenters(res.centers)
        }
    }

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

    const filteredTeachers = teachers.filter(t => {
        let match = true
        if (selectedCenterFilter) match = match && t.center === selectedCenterFilter
        if (selectedHallFilter) match = match && t.hall === selectedHallFilter
        return match
    })

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

    async function handlePromote(id: string, name: string, profileId: string) {
        if (!confirm(`${name} 선생님을 관리자로 승격하시겠습니까?`)) return
        setLoading(true)
        // If profileId is missing, we can't promote properly using auth-admin
        if (!profileId) {
            toast({ title: '오류', description: '연동된 프로필 정보가 없어 승격할 수 없습니다.', variant: 'destructive' })
            setLoading(false)
            return
        }
        const res = await promoteToManager(profileId)
        if (res.success) {
            toast({ title: '승격 완료', description: `${name} 선생님이 관리자로 승격되었습니다.` })
            loadData()
        } else {
            toast({ title: '승격 실패', description: res.error, variant: 'destructive' })
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">선생님 관리</h1>
                    <p className="text-sm text-muted-foreground">
                        선생님을 등록하고 반에 배정하여 수업 자료를 자동으로 분류합니다.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => router.push('/admin/teachers/boards')} className="w-full sm:w-auto">
                        <Presentation className="mr-2 h-4 w-4" />
                        칠판 관리
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
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
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-2 mb-6">
                        <select
                            value={selectedCenterFilter}
                            onChange={(e) => setSelectedCenterFilter(e.target.value)}
                            className="p-2 border rounded-md bg-white text-sm h-10 w-full sm:w-40"
                        >
                            <option value="">모든 센터</option>
                            {availableCenters.filter(c => c.type === 'center').map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            value={selectedHallFilter}
                            onChange={(e) => setSelectedHallFilter(e.target.value)}
                            className="p-2 border rounded-md bg-white text-sm h-10 w-full sm:w-40"
                        >
                            <option value="">모든 관</option>
                            {availableCenters.filter(c => c.type === 'hall').map(h => (
                                <option key={h.id} value={h.name}>{h.name}</option>
                            ))}
                        </select>
                    </div>

                    {filteredTeachers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            검색된 선생님이 없습니다.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTeachers.map((teacher) => (
                                <Card key={teacher.id} className="relative group">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <CardTitle className="text-lg font-bold truncate w-full">
                                                {teacher.name}
                                            </CardTitle>
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {teacher.center && (
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                                                        {teacher.center}
                                                    </span>
                                                )}
                                                {teacher.hall && (
                                                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                                                        {teacher.hall}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${teacher.profile?.role === 'manager' || teacher.profile?.role === 'super_manager' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {teacher.profile?.role === 'super_manager' ? '슈퍼관리자' : (teacher.profile?.role === 'manager' ? '관리자' : '선생님')}
                                                </span>
                                            </div>
                                        </div>
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
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
                                                        <span key={g.id} className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10px] md:text-xs font-medium">
                                                            {g.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">배정된 반이 없습니다.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs px-2"
                                                onClick={() => openAssign(teacher)}
                                            >
                                                <Settings className="h-3 w-3 mr-1.5" />
                                                반 배정
                                            </Button>
                                            <TeacherEditDialog
                                                teacher={teacher}
                                                onSuccess={loadData}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="h-8 text-xs px-2">
                                                        <User className="h-3 w-3 mr-1.5" />
                                                        정보 수정
                                                    </Button>
                                                }
                                            />
                                            {currentProfile?.role === 'super_manager' && teacher.profile?.role === 'teacher' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs px-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                                    onClick={() => handlePromote(teacher.id, teacher.name, teacher.profile_id)}
                                                >
                                                    승격
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(teacher.id, teacher.name)}
                                            >
                                                <Trash2 className="h-3 w-3 mr-1.5" />
                                                삭제
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
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
