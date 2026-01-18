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

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('student_id', user.id)
        .order('class_date', { ascending: false })

      if (classesError) throw classesError

      // Get all class IDs
      const classIds = classesData?.map(c => c.id) || []

      // Fetch materials for all classes
      const { data: materialsData } = await supabase
        .from('materials')
        .select('class_id, type, content_url, order_index')
        .in('class_id', classIds)
        .order('order_index', { ascending: true })

      // Group materials by class_id
      const materialsByClass: Record<string, any[]> = {}
      materialsData?.forEach(material => {
        if (!materialsByClass[material.class_id]) {
          materialsByClass[material.class_id] = []
        }
        materialsByClass[material.class_id].push(material)
      })

      // Process classes with thumbnails and counts
      const processedClasses: ClassWithThumbnail[] = classesData?.map(cls => {
        const materials = materialsByClass[cls.id] || []
        const images = materials.filter(m => m.type === 'blackboard_image')
        const videos = materials.filter(m => m.type === 'video_link')

        // Get first image as thumbnail
        const thumbnail = images[0]?.content_url || null

        // Check if new (within 3 days)
        const daysDiff = differenceInDays(new Date(), new Date(cls.created_at))
        const isNew = daysDiff <= 3

        return {
          ...cls,
          thumbnail_url: thumbnail,
          material_count: images.length,
          video_count: videos.length,
          is_new: isNew,
        }
      }) || []

      setClasses(processedClasses)

      // Extract dates for calendar
      const dates = new Set(processedClasses.map(c => c.class_date))
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
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center">
              <Sparkles className="h-6 w-6 mr-2" />
              나의 학습 라이브러리
            </h1>
            <p className="text-blue-100 text-sm sm:text-base">
              총 {classes.length}개의 수업이 있습니다. 오늘도 화이팅하세요! 💪
            </p>
          </div>
        </div>
      </div>

      {/* Calendar & Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <Card className="lg:col-span-1">
          <div
            className="flex items-center justify-between p-4 cursor-pointer lg:cursor-default"
            onClick={() => setCalendarOpen(!calendarOpen)}
          >
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">수업 달력</h3>
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
            <CardContent className="pt-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border-0"
                locale={ko}
              />

              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="w-full mt-4"
                >
                  날짜 필터 해제
                </Button>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 flex items-center">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">정렬:</span>
                  <Button
                    variant={sortOrder === 'newest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('newest')}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    최신순
                  </Button>
                  <Button
                    variant={sortOrder === 'oldest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('oldest')}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    과거순
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
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
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    <span>{cls.material_count}페이지</span>
                  </div>
                  {cls.video_count > 0 && (
                    <div className="flex items-center">
                      <Video className="h-3 w-3 mr-1" />
                      <span>{cls.video_count}개 영상</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Styles for Calendar */}
      <style jsx global>{`
        .has-class-day::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: hsl(var(--primary));
          border-radius: 50%;
        }
      `}</style>
    </div>
  )
}
