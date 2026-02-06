'use client'

import { useEffect, useState } from 'react'
import { getCurrentProfile } from '@/lib/supabase/client'
import { getTeacherDashboardData } from '@/app/actions/teacher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const profile = await getCurrentProfile()
                if (!profile) {
                    router.push('/login')
                    return
                }
                if (profile.role !== 'teacher') {
                    // Optionally redirect or show error
                }

                const res = await getTeacherDashboardData(profile.id)
                if (res.error) {
                    // logic for if teacher record doesn't exist yet but profile does
                    setError(res.error)
                } else {
                    setData(res)
                }
            } catch (err: any) {
                console.error(err)
                setError('데이터 로딩 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-2xl font-bold mb-2">오류 발생</h2>
                <p>{error}</p>
                <p className="text-sm mt-4 text-gray-500">관리자에게 문의해주세요.</p>
            </div>
        )
    }

    const { teacher, groups } = data

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-2">안녕하세요, {teacher.name} 선생님!</h1>
            <p className="text-muted-foreground mb-8">담당하시는 반과 학생 목록입니다.</p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groups.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            아직 배정된 반이 없습니다.
                        </CardContent>
                    </Card>
                ) : (
                    groups.map((group: any) => (
                        <Card key={group.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>{group.name}</span>
                                    <span className="text-sm font-normal bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {group.studentCount}명
                                    </span>
                                </CardTitle>
                                <CardDescription>{group.description || '반 설명이 없습니다.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                    {group.students && group.students.length > 0 ? (
                                        <div className="space-y-2">
                                            {group.students.map((student: any) => (
                                                <div key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {student.full_name?.slice(0, 1) || 'St'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{student.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">
                                            등록된 학생이 없습니다.
                                        </p>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
