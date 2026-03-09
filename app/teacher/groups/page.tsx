'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/client'
import { getTeacherDashboardData, getTeacherDashboardDataByTeacherId } from '@/app/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ChevronRight, BookOpen, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'

export default function TeacherGroupsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        }>
            <GroupsContent />
        </Suspense>
    )
}

function GroupsContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [groups, setGroups] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')

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
                        setGroups(res.groups || [])
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
                        setGroups(res.groups || [])
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
    }, [router, teacherId])

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-[1300px] mx-auto p-8 md:p-12 gap-10">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Classes</p>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">내 수업 관리</h1>
                    <p className="text-muted-foreground text-base mt-2">담당하고 있는 모든 반 목록입니다.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="반 이름 검색..."
                        className="pl-10 h-12 rounded-xl border-border bg-card/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </motion.header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                className="bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden rounded-3xl"
                                onClick={() => router.push(`/teacher/groups/${group.id}${teacherId ? `?teacherId=${teacherId}` : ''}`)}
                            >
                                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </CardHeader>
                                <CardContent>
                                    <CardTitle className="text-xl font-black mb-1 text-foreground group-hover:text-primary transition-colors">
                                        {group.name}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mb-4 min-h-[1.25rem] line-clamp-1">
                                        {group.description || '반 설명이 없습니다.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-primary/60" />
                                            <span className="text-xs font-bold text-muted-foreground">
                                                학생 <span className="text-foreground">{group.studentCount}</span>명
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                                            Active
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
                        className="col-span-full text-center py-20 border-2 border-dashed border-border rounded-[3rem] bg-card/10"
                    >
                        <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-lg font-bold text-muted-foreground">
                            {searchTerm ? '검색 결과가 없습니다.' : '배정된 반이 없습니다.'}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
