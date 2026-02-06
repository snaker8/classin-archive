'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase, getCurrentUser } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  BookOpen,
  Video,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { format, isAfter, isBefore, startOfDay, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ClassWithThumbnail {
  id: string
  student_id: string
  title: string
  description: string | null
  class_date: string
  created_at: string
  thumbnail_url: string | null
  material_count: number
  video_count: number
  is_new: boolean
}

// Skeleton Card Component
const SkeletonCard = () => (
  <Card className="overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-gray-200" />
    <CardContent className="p-4">
      <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
      <div className="h-5 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </CardContent>
  </Card>
)

export default function StudentDashboard() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassWithThumbnail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [classesWithDates, setClassesWithDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // Use Server Action
      const { getStudentClasses } = await import('@/app/actions/class')
      const { classes: fetchedClasses, error } = await getStudentClasses(user.id)

      if (error) {
        console.error('Error loading classes:', error)
        return
      }

      setClasses(fetchedClasses || [])

      // Extract dates for calendar
      const dates = new Set((fetchedClasses || []).map(c => c.class_date))
      setClassesWithDates(dates)
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort classes
  const filteredClasses = useMemo(() => {
    let result = [...classes]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(cls =>
        cls.title.toLowerCase().includes(query) ||
        cls.description?.toLowerCase().includes(query)
      )
    }

    // Date filter
    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
      result = result.filter(cls => cls.class_date === selectedDateStr)
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.class_date).getTime()
      const dateB = new Date(b.class_date).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [classes, searchQuery, selectedDate, sortOrder])

  // Calendar modifiers
  const modifiers = {
    hasClass: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return classesWithDates.has(dateStr)
    },
  }

  const modifiersStyles = {
    hasClass: {
      position: 'relative' as const,
    }
  }

  const modifiersClassNames = {
    hasClass: 'has-class-day'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-violet-600 z-0" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-900/40 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-heading font-bold mb-2 md:mb-3 flex items-center tracking-tight">
              <Sparkles className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-yellow-300 animate-pulse" />
              나의 학습 라이브러리
            </h1>
            <p className="text-indigo-100 text-sm sm:text-lg font-medium max-w-2xl leading-relaxed">
              총 <span className="text-white font-bold text-lg md:text-xl">{classes.length}</span>개의 수업이 기록되었습니다. <br className="hidden sm:block" />
              오늘도 배움의 즐거움을 느껴보세요! ✨
            </p>
          </div>
        </div>
      </div>

      {/* Calendar & Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <Card className="lg:col-span-1 border-white/20 bg-white/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div
            className="flex items-center justify-between p-5 cursor-pointer lg:cursor-default border-b border-gray-100/50"
            onClick={() => setCalendarOpen(!calendarOpen)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">수업 달력</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
            >
              {calendarOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          <div className={`${calendarOpen ? 'block' : 'hidden'} lg:block`}>
            <CardContent className="pt-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                modifiersClassNames={modifiersClassNames}
                className="rounded-xl border-0 w-full flex justify-center p-0"
                classNames={{
                  head_cell: "text-muted-foreground font-normal text-[0.8rem]",
                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg shadow-md scale-105 transition-transform",
                  day_today: "bg-accent text-accent-foreground font-bold rounded-lg",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                locale={ko}
              />

              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="w-full mt-6 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  날짜 필터 해제
                </Button>
              )}

              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs text-primary/80 flex items-center justify-center font-medium">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  파란색 점은 수업이 있는 날입니다
                </p>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Search & Sort Card */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="수업 제목이나 내용으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort & Stats */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center sm:justify-between">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">정렬:</span>
                  <Button
                    variant={sortOrder === 'newest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('newest')}
                    className="flex-1 sm:flex-none h-8 text-xs"
                  >
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    최신순
                  </Button>
                  <Button
                    variant={sortOrder === 'oldest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('oldest')}
                    className="flex-1 sm:flex-none h-8 text-xs"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    과거순
                  </Button>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground text-right">
                  {filteredClasses.length}개 수업
                </div>
              </div>

              {/* Active Filters */}
              {(searchQuery || selectedDate) && (
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">활성 필터:</span>
                  {searchQuery && (
                    <div className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      검색: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-1 hover:text-primary/80"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {selectedDate && (
                    <div className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      날짜: {format(selectedDate, 'M월 d일', { locale: ko })}
                      <button
                        onClick={() => setSelectedDate(undefined)}
                        className="ml-1 hover:text-primary/80"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold mb-2">수업을 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            {searchQuery || selectedDate
              ? '검색 조건을 변경해보세요'
              : '선생님께서 수업 자료를 업로드하면 여기에 표시됩니다'}
          </p>
          {(searchQuery || selectedDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSelectedDate(undefined)
              }}
            >
              모든 필터 해제
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClasses.map((cls) => (
            <Card
              key={cls.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(`/viewer/${cls.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {cls.thumbnail_url ? (
                  <Image
                    src={cls.thumbnail_url}
                    alt={cls.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-gray-300" />
                  </div>
                )}

                {/* Date Badge */}
                <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  {format(parseISO(cls.class_date), 'M월 d일 (eee)', { locale: ko })}
                </div>

                {/* New Badge */}
                {cls.is_new && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                    NEW
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <Button
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110"
                  >
                    복습하기 →
                  </Button>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {cls.title}
                </h3>

                {cls.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {cls.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-2 text-xs">
                  {/* Blackboard Badge */}
                  {(cls.material_count - cls.video_count > 0) && (
                    <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                      <BookOpen className="h-3 w-3 mr-1" />
                      <span>판서</span>
                    </div>
                  )}
                  {/* Video Badge */}
                  {cls.video_count > 0 && (
                    <div className="flex items-center bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                      <Video className="h-3 w-3 mr-1" />
                      <span>영상</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


    </div>
  )
}
