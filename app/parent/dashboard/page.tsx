'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, BookOpen, Video, Search, ChevronDown, ChevronUp, Loader2, FileImage, FolderOpen, X, User } from 'lucide-react'
import { getStudentClasses } from '@/app/actions/class'
import { getParentChildren } from '@/app/actions/student'
import { cn, formatDate } from '@/lib/utils'
import Image from 'next/image'

interface ChildProfile {
  id: string
  full_name: string
  grade?: string
  school?: string
  center?: string
  hall?: string
}

interface StudentClass {
  id: string
  title: string
  class_date: string
  material_count?: number
  video_count?: number
  thumbnail_url?: string
  materials?: { type: string, content_url?: string, title?: string }[]
}

export default function ParentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
      </div>
    }>
      <ParentDashboardContent />
    </Suspense>
  )
}

function ParentDashboardContent() {
  const router = useRouter()
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [classesLoading, setClassesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      loadClasses(selectedChild)
    }
  }, [selectedChild])

  async function loadChildren() {
    setLoading(true)
    try {
      const result = await getParentChildren()
      if (result.children && result.children.length > 0) {
        setChildren(result.children)
        setSelectedChild(result.children[0].id)
      }
    } catch (error) {
      console.error('Error loading children:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadClasses(childId: string) {
    setClassesLoading(true)
    try {
      const result = await getStudentClasses(childId)
      if (result.classes) {
        setClasses(result.classes)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setClassesLoading(false)
    }
  }

  const currentChild = children.find(c => c.id === selectedChild)

  const classDates = useMemo(() => {
    return new Set(classes.map(c => new Date(c.class_date).toDateString()))
  }, [classes])

  const filteredClasses = useMemo(() => {
    let filtered = [...classes]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(cls => cls.title.toLowerCase().includes(query))
    }

    if (selectedDate) {
      const selectedDateStr = selectedDate.toDateString()
      filtered = filtered.filter(cls => new Date(cls.class_date).toDateString() === selectedDateStr)
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.class_date).getTime()
      const dateB = new Date(b.class_date).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [classes, searchQuery, sortOrder, selectedDate])

  const stats = useMemo(() => {
    const totalMaterials = classes.reduce((sum, cls) => sum + (cls.material_count || 0), 0)
    const totalVideos = classes.reduce((sum, cls) =>
      sum + (cls.materials?.filter(m => m.type.includes('video')).length || 0), 0)
    return {
      totalClasses: classes.length,
      totalMaterials,
      totalVideos,
      thisMonth: classes.filter(cls => {
        const date = new Date(cls.class_date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).length
    }
  }, [classes])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-medium">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold mb-2">연결된 학생이 없습니다</h3>
          <p className="text-muted-foreground text-sm">
            학생 등록 시 학부모 전화번호가 입력되면 자동으로 연결됩니다.
            관리자에게 문의해 주세요.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-emerald-500/10 via-teal-50 to-cyan-50 border">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-200 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Parent Portal</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {currentChild?.full_name} 학생의 학습 현황
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentChild?.grade && `${currentChild.grade}`}
            {currentChild?.school && ` / ${currentChild.school}`}
            {!currentChild?.grade && !currentChild?.school && `지금까지 ${stats.totalClasses}개의 수업이 등록되어 있습니다`}
          </p>
        </div>
      </div>

      {/* Child Selector (multiple children) */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(child => (
            <Button
              key={child.id}
              variant={selectedChild === child.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedChild(child.id); setSearchQuery(''); setSelectedDate(undefined); }}
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              {child.full_name}
              {child.grade && <span className="ml-1 text-xs opacity-70">({child.grade})</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체 수업', value: stats.totalClasses, icon: BookOpen, color: 'text-primary', bgColor: 'bg-primary/10' },
          { label: '이번 달', value: stats.thisMonth, icon: CalendarIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: '총 자료', value: stats.totalMaterials, icon: FileImage, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
          { label: '영상 자료', value: stats.totalVideos, icon: Video, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classesLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        /* Main Content Grid */
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Classes List */}
          <div className="space-y-4">
            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="수업 제목으로 검색..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="shrink-0"
                >
                  {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronUp className="h-4 w-4 mr-2" />}
                  {sortOrder === 'desc' ? '최신순' : '오래된순'}
                </Button>
                <Button
                  variant={showCalendar ? 'default' : 'outline'}
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="shrink-0 lg:hidden"
                >
                  <CalendarIcon className="h-4 w-4 mr-1.5" />
                  일정
                </Button>
              </div>
              {selectedDate && (
                <Button variant="outline" onClick={() => setSelectedDate(undefined)} className="shrink-0">
                  <X className="h-3.5 w-3.5 mr-1" />
                  날짜 필터 해제
                </Button>
              )}
            </div>

            {/* Mobile Calendar */}
            {showCalendar && (
              <Card className="lg:hidden border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { setSelectedDate(date); if (date) setShowCalendar(false); }}
                    className="rounded-md"
                    modifiers={{ hasClass: (date: Date) => classDates.has(date.toDateString()) }}
                    modifiersClassNames={{ hasClass: "has-class-day" }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Classes Grid */}
            {filteredClasses.length === 0 ? (
              <Card className="p-16 text-center border overflow-hidden">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {searchQuery || selectedDate ? '검색 결과가 없습니다' : '등록된 수업이 없습니다'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || selectedDate
                    ? '다른 검색어나 날짜를 선택해 보세요.'
                    : '수업 자료가 업로드되면 여기에 표시됩니다.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <Card
                    key={cls.id}
                    className="border overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
                    onClick={() => router.push(`/student/viewer/${cls.id}`)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative bg-gradient-to-br from-primary/5 to-violet-50 overflow-hidden">
                      {cls.thumbnail_url ? (
                        <Image
                          src={cls.thumbnail_url}
                          alt={cls.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FolderOpen className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      {/* Material Count Badge */}
                      {(cls.material_count || 0) > 0 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                          {cls.material_count}개 자료
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {cls.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3" />
                          {formatDate(cls.class_date)}
                        </p>
                        <div className="flex items-center gap-2">
                          {(cls.materials?.filter(m => m.type.includes('video')).length || 0) > 0 && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              <Video className="h-3 w-3" />
                              {cls.materials?.filter(m => m.type.includes('video')).length}
                            </span>
                          )}
                          {(cls.materials?.filter(m => !m.type.includes('video')).length || 0) > 0 && (
                            <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                              <FileImage className="h-3 w-3" />
                              {cls.materials?.filter(m => !m.type.includes('video')).length}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Calendar */}
          <div className="hidden lg:block space-y-4">
            <Card className="border shadow-sm overflow-hidden sticky top-20">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md"
                  modifiers={{ hasClass: (date: Date) => classDates.has(date.toDateString()) }}
                  modifiersClassNames={{ hasClass: "has-class-day" }}
                />
                {selectedDate && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {selectedDate.toLocaleDateString('ko-KR')} 선택됨
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="text-xs">
                      필터 해제
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
