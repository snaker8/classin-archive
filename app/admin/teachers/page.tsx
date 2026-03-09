'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, User, Settings, Presentation, Users, Building2, GraduationCap, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function TeachersPage() {
    const router = useRouter()
    const [teachers, setTeachers] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentProfile, setCurrentProfile] = useState<any>(null)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTeacherName, setNewTeacherName] = useState('')
    const [submitting, setSubmitting] = useState(false)

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

    // Stats
    const stats = {
        total: teachers.length,
        managers: teachers.filter(t => t.profile?.role === 'manager' || t.profile?.role === 'super_manager').length,
        withGroups: teachers.filter(t => t.groups && t.groups.length > 0).length,
        centers: [...new Set(teachers.map(t => t.center).filter(Boolean))].length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg">
                            <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">선생님 관리</h1>
                            <p className="text-sm text-muted-foreground">
                                선생님을 등록하고 반에 배정하여 수업 자료를 자동 분류합니다.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => router.push('/admin/teachers/boards')}>
                            <Presentation className="mr-2 h-4 w-4" />
                            칠판 관리
                        </Button>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90">
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
                                        <Label htmlFor="name">선생님 성함</Label>
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
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {[
                        { label: '전체 선생님', value: stats.total, icon: Users, color: 'primary', bg: 'bg-primary/10' },
                        { label: '관리자', value: stats.managers, icon: Shield, color: 'amber-600', bg: 'bg-amber-50' },
                        { label: '반 배정됨', value: stats.withGroups, icon: Settings, color: 'emerald-600', bg: 'bg-emerald-50' },
                        { label: '소속 센터', value: stats.centers, icon: Building2, color: 'violet-600', bg: 'bg-violet-50' },
                    ].map((stat, i) => (
                        <Card key={stat.label} className="border hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                                        <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                                    </div>
                                    <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                        <stat.icon className={cn("h-5 w-5", `text-${stat.color}`)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-2"
                >
                    <select
                        value={selectedCenterFilter}
                        onChange={(e) => setSelectedCenterFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                        <option value="">모든 센터</option>
                        {availableCenters.filter(c => c.type === 'center').map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedHallFilter}
                        onChange={(e) => setSelectedHallFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                        <option value="">모든 관</option>
                        {availableCenters.filter(c => c.type === 'hall').map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                    </select>
                </motion.div>

                {/* Teachers Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredTeachers.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-16 text-center">
                            <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">검색된 선생님이 없습니다.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence>
                            {filteredTeachers.map((teacher, idx) => (
                                <motion.div
                                    key={teacher.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                >
                                    <Card className="border hover:shadow-lg transition-all duration-300 group overflow-hidden">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-primary">
                                                            {teacher.name[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base font-bold">{teacher.name}</CardTitle>
                                                        <div className="flex gap-1 mt-1 flex-wrap">
                                                            {teacher.center && (
                                                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                    {teacher.center}
                                                                </span>
                                                            )}
                                                            {teacher.hall && (
                                                                <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                    {teacher.hall}
                                                                </span>
                                                            )}
                                                            <span className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                                teacher.profile?.role === 'manager' || teacher.profile?.role === 'super_manager'
                                                                    ? 'bg-amber-50 text-amber-700'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            )}>
                                                                {teacher.profile?.role === 'super_manager' ? '슈퍼관리자' : (teacher.profile?.role === 'manager' ? '관리자' : '선생님')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="text-xs text-muted-foreground mb-3">
                                                등록일: {new Date(teacher.created_at).toLocaleDateString()}
                                            </div>

                                            <div className="mb-4">
                                                <div className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                                                    <Settings className="h-3 w-3" />
                                                    담당 반 ({teacher.groups?.length || 0})
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {teacher.groups && teacher.groups.length > 0 ? (
                                                        teacher.groups.slice(0, 4).map((g: any) => (
                                                            <span key={g.id} className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-[10px] font-medium">
                                                                {g.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">배정된 반이 없습니다</span>
                                                    )}
                                                    {teacher.groups && teacher.groups.length > 4 && (
                                                        <span className="text-xs text-muted-foreground">+{teacher.groups.length - 4}개</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => openAssign(teacher)}
                                                >
                                                    <Settings className="h-3 w-3 mr-1" />
                                                    반 배정
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs border-primary/20 hover:bg-primary/5"
                                                    onClick={() => router.push(`/teacher/dashboard?teacherId=${teacher.id}`)}
                                                >
                                                    <Presentation className="h-3 w-3 mr-1" />
                                                    대시보드
                                                </Button>
                                                <TeacherEditDialog
                                                    teacher={teacher}
                                                    onSuccess={loadData}
                                                    trigger={
                                                        <Button variant="outline" size="sm" className="h-8 text-xs">
                                                            <User className="h-3 w-3 mr-1" />
                                                            수정
                                                        </Button>
                                                    }
                                                />
                                                {currentProfile?.role === 'super_manager' && teacher.profile?.role === 'teacher' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handlePromote(teacher.id, teacher.name, teacher.profile_id)}
                                                    >
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        승격
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                                    onClick={() => handleDelete(teacher.id, teacher.name)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
                            <div className="space-y-3">
                                {groups.map((group) => {
                                    const isSelected = selectedGroupIds.includes(group.id)
                                    const assignedToOther = group.teacher_id && group.teacher_id !== assigningTeacher?.id

                                    return (
                                        <div key={group.id} className={cn(
                                            "flex items-start space-x-3 rounded-lg border p-3 transition-colors",
                                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                                        )}>
                                            <Checkbox
                                                id={`group-${group.id}`}
                                                checked={isSelected}
                                                onCheckedChange={() => toggleGroupSelection(group.id)}
                                            />
                                            <div className="grid gap-1 leading-none">
                                                <label
                                                    htmlFor={`group-${group.id}`}
                                                    className="text-sm font-medium cursor-pointer"
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
                                    <div className="text-center text-muted-foreground py-8">
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
        </div>
    )
}
