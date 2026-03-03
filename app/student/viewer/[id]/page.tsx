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
    <div className="fixed inset-0 bg-[#0f0f13] text-gray-100 flex flex-col font-sans selection:bg-primary/30">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
      </div>

      {/* 모바일 최적화 헤더 */}
      <header className="relative bg-[#18181b]/80 backdrop-blur-xl z-50 shadow-sm border-b border-white/10">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 뒤로가기 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white shrink-0 h-8 w-8 p-0 sm:w-auto sm:px-3 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">뒤로</span>
            </Button>

            {/* 제목 */}
            <div className="flex-1 min-w-0 border-l border-white/10 pl-2 sm:pl-3">
              <h1 className="font-bold text-gray-100 text-sm sm:text-base truncate">
                {classInfo.title}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
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
                  "h-8 px-2 sm:px-3 text-xs border-white/10",
                  isSplitView
                    ? "bg-primary/20 text-primary-300 ring-1 ring-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:bg-primary/30 border-transparent"
                    : "text-gray-300 hover:text-white hover:bg-white/10 bg-transparent"
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
                  className="h-8 px-2 sm:px-3 text-xs text-gray-300 hover:text-white hover:bg-white/10 border-white/10 bg-transparent"
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
                  className="h-8 px-2 sm:px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full group transition-all text-xs"
                >
                  <div className="bg-red-500 rounded-full p-0.5 mr-1 group-hover:scale-110 transition-transform">
                    <Play className="h-3 w-3 text-white fill-current" />
                  </div>
                  <span className="hidden sm:inline font-medium">수업 영상</span>
                </Button>
              )}

              {/* 전체화면 - 데스크탑만 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="hidden sm:flex h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
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
                    <div className="bg-[#18181b]/60 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
                      <div className="p-2.5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300 font-mono tracking-wide">PAGE {index + 1}</span>
                        <span className="flex items-center gap-2 text-[10px] text-gray-500">
                          분할 비교 모드
                        </span>
                      </div>
                      {/* 모바일: 세로 스택, 데스크탑: 가로 나란히 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        {/* Teacher Board */}
                        <div className="flex flex-col bg-[#1e1e24] p-3 rounded-xl border border-white/5 shadow-inner">
                          <div className="flex items-center gap-1.5 mb-3 bg-amber-500/10 w-fit px-2 py-1 rounded-md border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Teacher Board</span>
                          </div>
                          {group.teacher ? (
                            <img src={group.teacher.content_url} className="w-full h-auto rounded-lg shadow-sm" alt="Teacher board" />
                          ) : (
                            <div className="flex-1 min-h-[120px] rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-xs">
                              선생님 판서 없음
                            </div>
                          )}
                        </div>
                        {/* Student Board */}
                        <div className="flex flex-col bg-[#1e1e24] p-3 rounded-xl border border-white/5 shadow-inner">
                          <div className="flex items-center gap-1.5 mb-3 bg-blue-500/10 w-fit px-2 py-1 rounded-md border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">My Board</span>
                          </div>
                          {group.student ? (
                            <img src={group.student.content_url} className="w-full h-auto rounded-lg shadow-sm" alt="My board" />
                          ) : (
                            <div className="flex-1 min-h-[120px] rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-xs">
                              나의 판서 없음
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
      <footer className="relative bg-[#18181b]/80 backdrop-blur-xl px-4 py-3 border-t border-white/10 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-1 sm:px-2 pt-1 pb-safe max-w-7xl mx-auto">
          {/* 페이지 정보 + 모바일 플립 버튼 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-200 font-mono">
              {currentPage + 1} <span className="text-gray-500 font-normal tracking-wider">/ {currentImages.length}</span>
            </span>

            {isMobile && viewMode === 'flip' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 0} className="h-8 px-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage >= currentImages.length - 1} className="h-8 px-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <Grid3X3 className="h-3 w-3" />
              {viewMode === 'flip' ? '화살표 키로 이동' : '스크롤하여 보기'}
            </div>
          </div>

          {/* 썸네일 바 - 모바일에서도 잘 보이게 */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {currentImages.map((item: any, index: number) => (
              <button
                key={isSplitView ? index : item.id}
                onClick={() => goToPage(index)}
                className={`group relative flex-shrink-0 transition-all duration-300 rounded-lg overflow-hidden ${currentPage === index
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#18181b] scale-[1.05] shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                  : 'opacity-50 hover:opacity-100'
                  }`}
              >
                <img
                  src={isSplitView ? (item.student?.content_url || item.teacher?.content_url) : item.content_url}
                  alt={`Page ${index + 1}`}
                  className="w-14 h-20 sm:w-16 sm:h-24 object-cover border border-white/10"
                />
                <div className={`absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${currentPage === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                <div className={`absolute bottom-1 w-full text-center text-[10px] sm:text-xs font-medium text-white transition-opacity ${currentPage === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {index + 1}
                </div>
                {isSplitView && item.teacher && item.student && (
                  <div className="absolute top-1 right-1 bg-amber-500 w-2 h-2 rounded-full ring-2 ring-[#18181b] shadow-sm animate-pulse" />
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
