'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, BookOpen, Clock, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { getStudentClasses } from '@/app/actions/class'
import { supabase } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function StudentCalendarPage() {
    const router = useRouter()
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                const res = await getStudentClasses(session.user.id)
                if (res.classes) {
                    setClasses(res.classes)
                }
            }
        } catch (error) {
            console.error('Error loading calendar data:', error)
        } finally {
            setLoading(false)
        }
    }

    const classDates = useMemo(() => {
        return new Set(classes.map(c => new Date(c.class_date).toDateString()))
    }, [classes])

    const filteredClasses = useMemo(() => {
        if (!selectedDate) return []
        const dateStr = selectedDate.toDateString()
        return classes.filter(c => new Date(c.class_date).toDateString() === dateStr)
    }, [classes, selectedDate])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-5 sm:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/30 border"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-50" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm animate-pulse" />
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Learning Schedule</p>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        학습 일정
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        수업 일정을 확인하고 학습 자료를 바로 열어보세요
                    </p>
                </div>
            </motion.div>

            {/* 모바일: 캘린더 위, 목록 아래 / 데스크탑: 목록 왼쪽, 캘린더 오른쪽 */}
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-4 sm:gap-6">
                {/* 캘린더 - 모바일에서 맨 위 */}
                <div className="order-1 lg:order-2">
                    <Card className="border lg:sticky lg:top-20 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="p-3 sm:p-4 w-full"
                                modifiers={{
                                    hasClass: (date) => classDates.has(date.toDateString())
                                }}
                                modifiersClassNames={{
                                    hasClass: "bg-primary/10 text-primary font-bold hover:bg-primary/20 rounded-full"
                                }}
                            />
                        </div>
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t bg-muted/20">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <span>수업이 있는 날</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 선택한 날의 수업 목록 */}
                <div className="order-2 lg:order-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                            <span className="truncate">{selectedDate ? selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '날짜를 선택하세요'}</span>
                        </h2>
                        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full shrink-0">
                            {filteredClasses.length}개의 수업
                        </span>
                    </div>

                    {filteredClasses.length === 0 ? (
                        <Card className="p-10 sm:p-12 text-center border-dashed">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <CalendarIcon className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground text-sm">이 날은 예정된 수업이 없습니다.</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredClasses.map((c, idx) => (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card
                                        className="hover:shadow-md transition-all cursor-pointer border group"
                                        onClick={() => router.push(`/student/viewer/${c.id}`)}
                                    >
                                        <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                                                    {c.title}
                                                </h3>
                                                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(c.class_date)}
                                                    </span>
                                                    {c.material_count && (
                                                        <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded-sm font-medium">
                                                            {c.material_count}개 자료
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 shrink-0" />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
