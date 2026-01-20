'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, UserPlus, X, Search, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getGroupDetails, addMemberToGroup, removeMemberFromGroup } from '@/app/actions/group'
import { getStudents } from '@/app/actions/student'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function GroupDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [group, setGroup] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Add Member Modal State
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [allStudents, setAllStudents] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const res = await getGroupDetails(params.id)
        if (res.group) {
            setGroup(res.group)
            setMembers(res.members || [])
        }
        setLoading(false)
    }

    async function openAddModal() {
        setIsAddOpen(true)
        const res = await getStudents()
        if (res.students) {
            // Filter out already added members
            const currentMemberIds = new Set(members.map(m => m.id))
            setAllStudents(res.students.filter((s: any) => !currentMemberIds.has(s.id)))
        }
    }

    async function handleAddMember(studentId: string) {
        const res = await addMemberToGroup(params.id, studentId)
        if (res.success) {
            setIsAddOpen(false)
            loadData()
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    async function handleRemoveMember(studentId: string) {
        if (!confirm('이 학생을 반에서 제외하시겠습니까?')) return;

        const res = await removeMemberFromGroup(params.id, studentId)
        if (res.success) {
            loadData()
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const filteredStudents = allStudents.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone_number && s.phone_number.includes(searchTerm))
    )

    if (loading) return <div className="p-8 text-center">로딩 중...</div>
    if (!group) return <div className="p-8 text-center">반을 찾을 수 없습니다.</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/groups">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
                    <p className="text-muted-foreground">{group.description}</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                        구성원 ({members.length}명)
                    </CardTitle>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openAddModal}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                학생 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>학생 추가</DialogTitle>
                            </DialogHeader>
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="이름 검색..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filteredStudents.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        검색 결과가 없습니다.
                                    </div>
                                ) : (
                                    filteredStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-2 border rounded hover:bg-accent/50 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} />
                                                    <AvatarFallback>{student.full_name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium truncate">{student.full_name}</span>
                                                    {student.group_members && student.group_members.length > 0 && (
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            수강중: {student.group_members
                                                                .map((gm: any) => gm.group)
                                                                .filter((g: any) => g)
                                                                .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                                                                .map((g: any) => g.name)
                                                                .join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handleAddMember(student.id)} className="shrink-0 ml-2">
                                                선택
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {members.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                등록된 학생이 없습니다.
                            </div>
                        ) : (
                            members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/10 transition-colors">
                                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push(`/admin/students/${member.id}`)}>
                                        <Avatar className="h-9 w-9 border group-hover:ring-2 ring-primary/20 transition-all">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`} />
                                            <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold group-hover:text-primary transition-colors flex items-center gap-1">
                                                {member.full_name}
                                                <MoreHorizontal className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                등록일: {new Date(member.joined_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveMember(member.id)
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
