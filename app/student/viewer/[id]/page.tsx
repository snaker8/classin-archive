'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Class, Material } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  Loader2,
  BookOpen,
  SplitSquareHorizontal,
  Scroll,
  FileImage,
  Video,
  Calendar,
  Grid3X3,
  X,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Dynamic import for HTMLFlipBook
const HTMLFlipBook = dynamic(
  () => import('react-pageflip').then((mod) => mod.default as any),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[50vh] bg-gradient-to-br from-primary/5 to-violet-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-medium">자료를 준비하고 있습니다...</p>
        </div>
      </div>
    ),
  }
) as any

// Lazy Image Component - 모바일 최적화됨
const VisibleImage = ({ src, index }: { src: string; index: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, {
      rootMargin: '300px 0px',
      threshold: 0.01
    })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className="relative w-full bg-white shadow-md rounded-xl overflow-hidden border"
      style={{ minHeight: '200px' }}
    >
      <div className="absolute top-2 left-2 bg-primary text-white px-2.5 py-0.5 rounded-full text-xs font-bold z-10 shadow-sm">
        {index + 1}
      </div>

      {isVisible ? (
        <>
          {!loaded && (
            <div className="flex items-center justify-center p-16 text-muted-foreground bg-muted/30">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <p className="text-sm">페이지 {index + 1} 로딩 중...</p>
            </div>
          )}
          <img
            src={src}
            alt={`Page ${index + 1}`}
            className="w-full h-auto"
            style={{ display: loaded ? 'block' : 'none' }}
            loading="eager"
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        <div className="flex items-center justify-center p-16 text-muted-foreground bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-sm">페이지 {index + 1} 로딩 중...</p>
        </div>
      )}
    </motion.div>
  )
}

// Page Component for FlipBook
const Page = ({ imageUrl, pageNumber }: { imageUrl: string; pageNumber: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <div className="relative w-full h-full bg-white shadow-xl overflow-hidden rounded-lg">
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      )}

      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">이미지를 불러올 수 없습니다</p>
          </div>
        </div>
      )}

      <img
        src={imageUrl}
        alt={`Page ${pageNumber}`}
        className="w-full h-full object-contain"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{ display: imageLoaded && !imageError ? 'block' : 'none' }}
      />

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium">
        {pageNumber}
      </div>
    </div>
  )
}

export default function ViewerPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const flipBookRef = useRef<any>(null)

  // 뷰 모드: 모바일은 scroll이 기본
  const [viewMode, setViewMode] = useState<'flip' | 'scroll'>('scroll')

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // 모바일이면 스크롤 모드 유지, 데스크탑이면 flip도 가능
      if (mobile) setViewMode('scroll')
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadClassData()
  }, [classId])

  const loadClassData = async () => {
    try {
      const { getClass } = await import('@/app/actions/class')
      const { classInfo, materials, error } = await getClass(classId)

      if (error) {
        setErrorMsg(error)
        return
      }
      if (!classInfo) {
        setErrorMsg('Class not found')
        return
      }

      setClassInfo(classInfo)
      const matList = materials || []
      setMaterials(matList)

      // Auto-enable split view if teacher boards exist
      const hasTeacherBoards = matList.some(m => m.type === 'teacher_blackboard_image' || m.title?.startsWith('[T]'))
      if (hasTeacherBoards) {
        setIsSplitView(true)
      }
    } catch (error: any) {
      console.error('Error loading class data:', error)
      setErrorMsg(error.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const images = materials.filter(m => m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image')
  const videos = materials.filter(m => m.type === 'video_link')

  const groupedImages = images.reduce((acc, img) => {
    const idx = img.order_index;
    if (!acc[idx]) acc[idx] = { student: null, teacher: null };
    if (img.type === 'teacher_blackboard_image' || img.title?.startsWith('[T]')) acc[idx].teacher = img;
    else acc[idx].student = img;
    return acc;
  }, {} as Record<number, { student: Material | null, teacher: Material | null }>);

  const imageGroups = Object.keys(groupedImages)
    .map(Number)
    .sort((a, b) => a - b)
    .map(idx => ({ index: idx, ...groupedImages[idx] }));

  const [isSplitView, setIsSplitView] = useState(false);
  const currentImages = isSplitView ? imageGroups : images;

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data)
  }, [])

  const nextPage = () => {
    if (viewMode === 'flip' && flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext()
    }
  }

  const prevPage = () => {
    if (viewMode === 'flip' && flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev()
    }
  }

  const goToPage = (pageIndex: number) => {
    if (viewMode === 'flip' && flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(pageIndex)
    } else {
      const el = document.getElementById(`page-${pageIndex}`)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage()
      if (e.key === 'ArrowRight') nextPage()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewMode])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-foreground">수업 자료를 불러오는 중...</p>
          <p className="text-sm text-muted-foreground mt-2">잠시만 기다려주세요</p>
        </motion.div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="p-8 text-center max-w-md w-full border-destructive/20">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2 text-destructive">오류 발생</h2>
          <p className="text-muted-foreground mb-6">{errorMsg}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전 페이지로 돌아가기
          </Button>
        </Card>
      </div>
    )
  }

  if (!classInfo || (images.length === 0 && !isSplitView)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="p-8 text-center max-w-md w-full border-dashed">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-semibold mb-2 text-foreground">수업 자료가 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            선생님께서 자료를 업로드하면 여기에 표시됩니다.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전 페이지로 돌아가기
          </Button>
        </Card>
      </div>
    )
  }

  const getBookDimensions = () => {
    if (typeof window === 'undefined') return { width: 600, height: 800 }
    if (isMobile) {
      return { width: Math.min(window.innerWidth - 24, 400), height: Math.min(window.innerHeight - 220, 560) }
    }
    if (window.innerWidth < 1024) {
      return { width: 480, height: 640 }
    }
    return { width: 580, height: 780 }
  }

  const { width, height } = getBookDimensions()
  const showTwoPages = !isMobile && currentImages.length > 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* 모바일 최적화 헤더 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b shadow-sm">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 뒤로가기 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 p-0 sm:w-auto sm:px-3"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">뒤로</span>
            </Button>

            {/* 제목 */}
            <div className="flex-1 min-w-0 border-l pl-2 sm:pl-3">
              <h1 className="font-bold text-foreground text-sm sm:text-base truncate">
                {classInfo.title}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {formatDate(classInfo.class_date)}
              </p>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 분할 보기 - 모바일에서도 표시 */}
              <Button
                variant={isSplitView ? "default" : "outline"}
                size="sm"
                onClick={() => setIsSplitView(!isSplitView)}
                className={cn(
                  "h-8 px-2 sm:px-3 text-xs",
                  isSplitView && "bg-gradient-to-r from-primary to-violet-600"
                )}
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">분할</span>
              </Button>

              {/* 뷰모드 - 모바일에서는 스크롤만 */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(prev => prev === 'flip' ? 'scroll' : 'flip')}
                  className="h-8 px-2 sm:px-3 text-xs"
                >
                  {viewMode === 'flip' ? (
                    <><Scroll className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">스크롤</span></>
                  ) : (
                    <><BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">책 넘김</span></>
                  )}
                </Button>
              )}

              {/* 영상 버튼 */}
              {videos.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => window.open(videos[0].content_url, '_blank')}
                  className="h-8 px-2 sm:px-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">영상</span>
                </Button>
              )}

              {/* 전체화면 - 데스크탑만 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="hidden sm:flex h-8 w-8"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>


      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'scroll' ? (
          <div className="h-full overflow-y-auto">
            <div className="p-3 sm:p-4 pb-32 space-y-4 max-w-4xl mx-auto">
              {isSplitView ? (
                imageGroups.map((group, index) => (
                  <motion.div
                    id={`page-${index}`}
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <Card className="overflow-hidden border">
                      <CardContent className="p-0">
                        <div className="p-2.5 border-b bg-muted/30">
                          <span className="text-xs font-bold text-primary">페이지 {index + 1}</span>
                        </div>
                        {/* 모바일: 세로 스택, 데스크탑: 가로 나란히 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                          {/* Teacher Board */}
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-sm">👨‍🏫</span>
                              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Teacher Board</span>
                            </div>
                            {group.teacher ? (
                              <img src={group.teacher.content_url} className="w-full h-auto rounded-lg border shadow-sm" alt="Teacher board" />
                            ) : (
                              <div className="h-32 rounded-lg bg-muted/50 border-2 border-dashed flex items-center justify-center text-muted-foreground text-xs">
                                선생님 판서 없음
                              </div>
                            )}
                          </div>
                          {/* Student Board */}
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-sm">📝</span>
                              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">My Board</span>
                            </div>
                            {group.student ? (
                              <img src={group.student.content_url} className="w-full h-auto rounded-lg border shadow-sm" alt="My board" />
                            ) : (
                              <div className="h-32 rounded-lg bg-muted/50 border-2 border-dashed flex items-center justify-center text-muted-foreground text-xs">
                                나의 판서 없음
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                currentImages.map((image: any, index: number) => (
                  <div id={`page-${index}`} key={image.id}>
                    <VisibleImage src={image.content_url} index={index} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // 플립북 모드 (데스크탑에서만)
          <div className="h-full flex items-center justify-center p-4 sm:p-8">
            <div className="relative">
              {typeof window !== 'undefined' && (
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={width}
                  height={height}
                  size="stretch"
                  minWidth={280}
                  maxWidth={1000}
                  minHeight={400}
                  maxHeight={1200}
                  showCover={true}
                  flippingTime={1000}
                  usePortrait={isMobile}
                  startPage={0}
                  drawShadow={true}
                  className="flip-book"
                  style={{}}
                  startZIndex={0}
                  autoSize={true}
                  maxShadowOpacity={0.3}
                  mobileScrollSupport={true}
                  onFlip={onFlip}
                  onChangeOrientation={() => { }}
                  onChangeState={() => { }}
                >
                  {isSplitView ? (
                    imageGroups.map((group, index) => (
                      <div key={index} className="page">
                        <div className="relative w-full h-full bg-white flex flex-col p-3 rounded-lg shadow-lg">
                          <div className="grid grid-rows-2 h-full gap-2">
                            <div className="relative bg-white rounded-xl overflow-hidden border-2 border-blue-100">
                              <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 text-[10px] z-10 font-bold rounded-bl-lg">Teacher</div>
                              {group.teacher ? (
                                <img src={group.teacher.content_url} className="w-full h-full object-contain" alt="Teacher" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">선생님 판서 없음</div>
                              )}
                            </div>
                            <div className="relative bg-white rounded-xl overflow-hidden border-2 border-emerald-100">
                              <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1 text-[10px] z-10 font-bold rounded-bl-lg">My Work</div>
                              {group.student ? (
                                <img src={group.student.content_url} className="w-full h-full object-contain" alt="My work" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">나의 판서 없음</div>
                              )}
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">Page {index + 1}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    currentImages.map((image: any, index: number) => (
                      <div key={image.id} className="page">
                        <Page imageUrl={image.content_url} pageNumber={index + 1} />
                      </div>
                    ))
                  )}
                </HTMLFlipBook>
              )}

              {/* 내비게이션 화살표 - 데스크탑만 */}
              {!isMobile && viewMode === 'flip' && (
                <>
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="absolute left-[-56px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20 border"
                  >
                    <ChevronLeft className="h-6 w-6 text-foreground" />
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={currentPage >= currentImages.length - (showTwoPages ? 2 : 1)}
                    className="absolute right-[-56px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20 border"
                  >
                    <ChevronRight className="h-6 w-6 text-foreground" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 풋터 - 모바일 최적화 */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t shadow-lg">
        <div className="px-3 sm:px-4 pt-2 pb-safe">
          {/* 페이지 정보 + 모바일 플립 버튼 */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-foreground">
              {currentPage + 1} <span className="text-muted-foreground font-normal text-xs">/ {currentImages.length}</span>
            </span>

            {isMobile && viewMode === 'flip' && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={prevPage} disabled={currentPage === 0} className="h-8 px-3">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={nextPage} disabled={currentPage >= currentImages.length - 1} className="h-8 px-3">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Grid3X3 className="h-3 w-3" />
              {viewMode === 'flip' ? '화살표 키로 이동' : '스크롤하여 보기'}
            </div>
          </div>

          {/* 썸네일 바 - 모바일에서도 잘 보이게 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {currentImages.map((item: any, index: number) => (
              <button
                key={isSplitView ? index : item.id}
                onClick={() => goToPage(index)}
                className={cn(
                  "relative flex-shrink-0 transition-all rounded-md overflow-hidden",
                  currentPage === index
                    ? 'ring-2 ring-primary ring-offset-1 scale-105'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                <img
                  src={isSplitView ? (item.student?.content_url || item.teacher?.content_url) : item.content_url}
                  alt={`Page ${index + 1}`}
                  className="w-10 h-14 sm:w-12 sm:h-16 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] text-center py-0.5 font-medium">
                  {index + 1}
                </div>
                {isSplitView && item.teacher && item.student && (
                  <div className="absolute top-0.5 right-0.5 bg-primary w-1.5 h-1.5 rounded-full border border-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .flip-book {
          margin: 0 auto;
        }
        .page {
          background-color: white;
        }
        /* 모바일 safe area */
        .pb-safe {
          padding-bottom: max(8px, env(safe-area-inset-bottom));
        }
        /* 스크롤바 숨기기 */
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
