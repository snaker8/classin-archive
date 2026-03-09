'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/client'
import { getTeacherDashboardData, getTeacherDashboardDataByTeacherId } from '@/app/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Calendar, FileText, Play, Image as ImageIcon, Users, BookOpen, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { getGroupSessions } from '@/app/actions/group'
import { SessionDetailDialog } from '@/components/admin/session-detail-dialog'
import { StudentQuickViewDialog } from '@/components/teacher/student-quick-view-dialog'

export default function GroupDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        }>
            <DetailContent />
        </Suspense>
    )
}

function DetailContent() {
    const router = useRouter()
    const { id: groupId } = useParams()
    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [error, setError] = useState('')

    const [sessions, setSessions] = useState<any[]>([])
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false)

    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false)

    const searchParams = useSearchParams()
    const teacherId = searchParams.get('teacherId')

    useEffect(() => {
        async function load() {
            try {
                if (teacherId) {
                    const res = await getTeacherDashboardDataByTeacherId(teacherId)
                    if (res.error) {
                        setError(res.error)
                    } else {
                        const found = res.groups?.find((g: any) => g.id === groupId)
                        if (found) {
                            setGroup(found)
                            const sessionRes = await getGroupSessions(groupId as string)
                            if (sessionRes.sessions) {
                                setSessions(sessionRes.sessions)
                            }
                        } else {
                            setError('반을 찾을 수 없거나 권한이 없습니다.')
                        }
                    }
                } else {
                    const profile = await getCurrentProfile()
                    if (!profile) {
                        router.push('/login')
                        return
                    }

                    const res = await getTeacherDashboardData(profile.id)
                    if (res.error) {
                        setError(res.error)
                    } else {
                        const found = res.groups?.find((g: any) => g.id === groupId)
                        if (found) {
                            setGroup(found)
                            const sessionRes = await getGroupSessions(groupId as string)
                            if (sessionRes.sessions) {
                                setSessions(sessionRes.sessions)
                            }
                        } else {
                            setError('반을 찾을 수 없거나 권한이 없습니다.')
                        }
                    }
                }
            } catch (err) {
                console.error(err)
                setError('데이터 로딩 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [groupId, router, teacherId])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        )
    }

    if (error || !group) {
        return (
            <div className="flex h-full items-center justify-center p-20">
                <div className="text-center">
                    <p className="text-destructive font-bold mb-4">{error || 'Unknown Error'}</p>
                    <Button onClick={() => router.back()}>뒤로 가기</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-[1300px] mx-auto p-8 md:p-12 gap-10">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <Button
                    variant="ghost"
                    className="pl-0 text-muted-foreground hover:text-primary gap-2"
                    onClick={() => router.push(`/teacher/dashboard${teacherId ? `?teacherId=${teacherId}` : ''}`)}
                >
                    <ChevronLeft className="h-4 w-4" />
                    대시보드로 돌아가기
                </Button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-foreground mb-2">{group.name}</h1>
                        <p className="text-muted-foreground text-lg">{group.description || '반 설명이 없습니다.'}</p>
                    </div>
                    <div className="flex items-center gap-6 px-8 py-4 bg-card border rounded-[2rem] shadow-sm">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Students</span>
                            <span className="text-2xl font-black text-primary">{group.studentCount}</span>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Active</span>
                        </div>
                    </div>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                            <Calendar className="h-6 w-6 text-primary" />
                            수업 기록
                        </h2>
                        <div className="space-y-4">
                            {sessions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-3xl">
                                    아직 기록된 수업이 없습니다.
                                </div>
                            ) : (
                                sessions.map((session) => (
                                    <Card key={session.key}
                                        className="bg-card border-border hover:border-primary/20 hover:shadow-lg transition-all rounded-[2rem] p-6 group cursor-pointer"
                                        onClick={() => {
                                            setSelectedSession(session)
                                            setIsSessionDetailOpen(true)
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                    <BookOpen className="h-8 w-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                                        {session.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                                                        {session.class_date ? format(new Date(session.class_date), 'yyyy년 MM월 dd일') : '날짜 정보 없음'}
                                                        <span className="mx-2">•</span>
                                                        {session.student_count}명 배포됨
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary">
                                                        <Play className="h-3 w-3 fill-current" />
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-blue-500/10 border-2 border-card flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                        <ImageIcon className="h-3 w-3" />
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <Card className="bg-card border-border rounded-[2.5rem] p-8">
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                                <Users className="h-6 w-6 text-primary" />
                                학생 명단
                            </h2>
                            <div className="space-y-4">
                                {group.students?.map((student: any) => (
                                    <div key={student.id}
                                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            setSelectedStudent(student)
                                            setIsStudentDetailOpen(true)
                                        }}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform">
                                            {student.avatar_url ? (
                                                <img src={student.avatar_url} alt={student.full_name} className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                student.full_name?.slice(0, 1)
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-foreground">{student.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">Student</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>
                </div>
            </div>

            <SessionDetailDialog
                open={isSessionDetailOpen}
                onOpenChange={setIsSessionDetailOpen}
                session={selectedSession}
            />
            <StudentQuickViewDialog
                open={isStudentDetailOpen}
                onOpenChange={setIsStudentDetailOpen}
                student={selectedStudent}
            />
        </div>
    )
}
