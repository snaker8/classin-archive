'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getCurrentProfile } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, BookOpen, Video, Search, ChevronDown, ChevronUp, Loader2, Clock, FileImage, Play, FolderOpen, X, FileText } from 'lucide-react'
import { getStudentClasses } from '@/app/actions/class'
import { cn, formatDate } from '@/lib/utils'
import Image from 'next/image'

interface StudentClass {
  id: string
  title: string
  class_date: string
  material_count?: number
  video_count?: number
  thumbnail_url?: string
  materials?: { type: string, content_url?: string, title?: string }[]
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  )
}

function StudentDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentIdParam = searchParams.get('studentId')

  const [isAdminView, setIsAdminView] = useState(false)
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      let targetStudentId = session?.user?.id

      if (studentIdParam) {
        const profile = await getCurrentProfile()
        if (profile && ['admin', 'manager', 'super_manager', 'teacher'].includes(profile.role)) {
          targetStudentId = studentIdParam
          setIsAdminView(true)
        }
      }

      if (targetStudentId) {
        const result = await getStudentClasses(targetStudentId)
        if (result.classes) {
          setClasses(result.classes)
        }
      } else {
        // Fallback for cases where session might take a moment to initialize
        // But only if we're not explicitly trying to view a student as admin
        if (!studentIdParam) {
          await new Promise(resolve => setTimeout(resolve, 800))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession?.user?.id) {
            const result = await getStudentClasses(retrySession.user.id)
            if (result.classes) setClasses(result.classes)
          }
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const classDates = useMemo(() => {
    return new Set(classes.map(c => new Date(c.class_date).toDateString()))
  }, [classes])

  const filteredClasses = useMemo(() => {
    let filtered = [...classes]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(cls =>
        cls.title.toLowerCase().includes(query)
      )
    }

    if (selectedDate) {
      const selectedDateStr = selectedDate.toDateString()
      filtered = filtered.filter(cls =>
        new Date(cls.class_date).toDateString() === selectedDateStr
      )
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-medium">수업 자료를 불러오는 중...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary/10 via-violet-50 to-blue-50 border"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-violet-200 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{isAdminView ? 'Admin View' : 'Learning Portal'}</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isAdminView ? '학생 대시보드 미리보기' : '나의 학습 라이브러리'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdminView ? '해당 학생의 화면 구조를 보고 있습니다.' : `지금까지 ${stats.totalClasses}개의 수업에서 ${stats.totalMaterials}개의 학습 자료(영상/문서)가 등록되어 있어요`}
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: '전체 수업', value: stats.totalClasses, icon: BookOpen, color: 'text-primary', bgColor: 'bg-primary/10' },
          { label: '이번 달', value: stats.thisMonth, icon: CalendarIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: '총 자료', value: stats.totalMaterials, icon: FileImage, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
          { label: '영상 자료', value: stats.totalVideos, icon: Video, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <Card className="border hover:shadow-md transition-shadow overflow-hidden">
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
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Classes List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
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
              {/* 모바일 캘린더 토글 */}
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
              <Button
                variant="outline"
                onClick={() => { setSelectedDate(undefined); }}
                className="shrink-0"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                날짜 필터 해제
              </Button>
            )}
          </div>

          {/* 모바일 캘린더 패널 (토글) */}
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden"
            >
              <Card className="border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { setSelectedDate(date); if (date) setShowCalendar(false); }}
                    className="rounded-md"
                    modifiers={{ hasClass: (date) => classDates.has(date.toDateString()) }}
                    modifiersClassNames={{ hasClass: "has-class-day" }}
                  />
                  {selectedDate && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {selectedDate.toLocaleDateString('ko-KR')} 선택됨
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Classes Grid */}
          {filteredClasses.length === 0 ? (
            <Card className="p-16 text-center border overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="relative z-10">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {searchQuery || selectedDate ? '검색 결과가 없습니다' : '수업 준비 중입니다'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                  {searchQuery || selectedDate
                    ? '다른 검색어나 날짜를 선택해 보세요.'
                    : '선생님께서 수업 자료를 업로드하시면 여기에 학습 카드들이 나타납니다.'}
                </p>
                {!(searchQuery || selectedDate) && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.push('/student/calendar')}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      학습 일정 확인하기
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/student/materials')}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      전체 자료실 가기
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredClasses.map((cls, idx) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      className={cn(
                        "border overflow-hidden cursor-pointer group hover:shadow-lg transition-all relative",
                        navigatingId === cls.id && "ring-2 ring-primary opacity-80"
                      )}
                      onClick={() => {
                        setNavigatingId(cls.id);
                        router.push(`/student/viewer/${cls.id}`);
                      }}
                    >
                      {navigatingId === cls.id && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {/* Thumbnail */}
                      <div className="aspect-video relative bg-gradient-to-br from-primary/5 to-violet-50 overflow-hidden">
                        {cls.thumbnail_url ? (
                          <Image
                            src={cls.thumbnail_url}
                            alt={cls.title}
                            fill
                            priority={idx < 6}
                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-primary/30" />
                          </div>
                        )}
                        {/* Date Badge */}
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-sm">
                          {formatDate(cls.class_date)}
                        </div>
                        {/* Video Indicator Badge */}
                        {cls.video_count && cls.video_count > 0 ? (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-rose-500/90 backdrop-blur-sm text-[10px] font-bold text-white shadow-sm flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                            <Video className="h-3 w-3" />
                            <span>{cls.video_count} REC</span>
                          </div>
                        ) : null}
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
                            <Play className="h-5 w-5 text-primary ml-1" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {cls.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {cls.material_count || 0}개 학습자료
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(cls.class_date)}
                          </span>
                        </div>
                        {/* 영상 바로보기 버튼 */}
                        {cls.materials?.some(m => m.type === 'video_link') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const video = cls.materials?.find(m => m.type === 'video_link')
                              if (video?.content_url) {
                                setActiveVideo(video.content_url)
                              }
                            }}
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                            수업 영상 보기
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

        {/* Calendar & Materials Sidebar - 데스크탑만 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:order-last"
        >
          {/* Calendar */}
          <Card className="border shrink-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                수업 캘린더
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  hasClass: (date) => classDates.has(date.toDateString())
                }}
                modifiersClassNames={{
                  hasClass: "has-class-day"
                }}
              />
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {selectedDate.toLocaleDateString('ko-KR')} 선택됨
                </p>
              )}
            </CardContent>
          </Card>

          {/* Materials Panel */}
          <Card className="border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden bg-white/50 backdrop-blur-sm">
            {(() => {
              const selectedClassForMaterials = selectedDate
                ? classes.find(cls => new Date(cls.class_date).toDateString() === selectedDate.toDateString())
                : classes[0];

              if (!selectedClassForMaterials) {
                return (
                  <>
                    <div className="p-4 border-b bg-muted/30 shrink-0 flex items-center justify-between">
                      <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        Materials
                      </h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <BookOpen className="h-8 w-8 mb-3 opacity-20" />
                      <span className="text-sm">등록된 학습 자료가 없습니다</span>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="p-4 border-b bg-muted/30 shrink-0 flex items-center justify-between">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      Materials
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium bg-white px-2 py-1 rounded-md shadow-sm border">
                      {formatDate(selectedClassForMaterials.class_date)}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                    {(!selectedClassForMaterials.materials || selectedClassForMaterials.materials.length === 0) ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                        <BookOpen className="h-8 w-8 mb-3 opacity-20" />
                        <span className="text-sm">등록된 자료가 없습니다</span>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {selectedClassForMaterials.materials.map((m: any, idx: number) => (
                          <div key={idx} className="p-4 hover:bg-white transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2.5 rounded-xl shrink-0 transition-colors",
                                m.type === 'video_link' ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' :
                                  (m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image') ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' :
                                    'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                              )}>
                                {m.type === 'video_link' ? <Video className="h-4 w-4" /> :
                                  (m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image') ? <FileImage className="h-4 w-4" /> :
                                    <FileText className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 truncate mb-0.5">
                                  {m.title || (m.type === 'video_link' ? '수업 영상' : m.type.includes('blackboard') ? '수업 판서' : '학습 자료')}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                  {m.type === 'video_link' ? 'Video' : m.type.includes('blackboard') ? 'Blackboard' : 'Material'}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-4 rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-colors font-bold"
                                onClick={() => {
                                  if (m.type === 'video_link' && m.content_url) {
                                    window.open(m.content_url, '_blank');
                                  } else {
                                    router.push(`/student/viewer/${selectedClassForMaterials.id}`);
                                  }
                                }}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </Card>
        </motion.div>
      </div>

      {/* 플로팅 비디오 플레이어 */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-[100] w-[min(90vw,420px)] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                수업 영상
              </span>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative pt-[56.25%] w-full bg-black">
              {(() => {
                const isYouTube = activeVideo.includes('youtube.com') || activeVideo.includes('youtu.be')
                let embedUrl = activeVideo
                if (isYouTube) {
                  const videoId = activeVideo.includes('v=')
                    ? activeVideo.split('v=')[1].split('&')[0]
                    : activeVideo.split('/').pop()?.split('?')[0]
                  embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`
                }
                return isYouTube ? (
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeVideo}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full"
                    autoPlay
                  />
                )
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
