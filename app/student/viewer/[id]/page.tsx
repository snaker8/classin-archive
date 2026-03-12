'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Class, Material } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
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

// Zoomable Image Component - 터치하여 바로 확대 가능
const ZoomableImage = ({ src, alt, className: imgClassName }: { src: string; alt: string; className?: string }) => {
  const [isZoomed, setIsZoomed] = useState(false)

  return (
    <TransformWrapper
      initialScale={1}
      minScale={1}
      maxScale={5}
      doubleClick={{ mode: 'toggle', step: 2.5 }}
      pinch={{ step: 5 }}
      wheel={{ step: 0.1 }}
      panning={{ disabled: !isZoomed }}
      alignmentAnimation={{ disabled: true }}
      velocityAnimation={{ disabled: true }}
      onTransformed={(_, { scale }) => setIsZoomed(scale > 1.05)}
    >
      {({ resetTransform }) => (
        <div className="relative" style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}>
          {isZoomed && (
            <button
              onClick={() => resetTransform()}
              className="absolute top-2 right-2 z-20 bg-black/60 text-white backdrop-blur-md rounded-full p-1.5 shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <TransformComponent
            wrapperStyle={{ width: '100%', touchAction: isZoomed ? 'none' : 'pan-y' }}
            contentStyle={{ width: '100%' }}
          >
            <img
              src={src}
              alt={alt}
              className={imgClassName || "w-full h-auto"}
              draggable={false}
            />
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  )
}

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
      <div className="absolute top-2 left-2 bg-primary text-white px-2.5 py-0.5 rounded-full text-xs font-bold z-20 shadow-sm">
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
          <div style={{ display: loaded ? 'block' : 'none' }}>
            <ZoomableImage src={src} alt={`Page ${index + 1}`} />
          </div>
          {/* Hidden img for onLoad detection */}
          {!loaded && (
            <img
              src={src}
              alt=""
              className="hidden"
              onLoad={() => setLoaded(true)}
            />
          )}
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
  const [viewContext, setViewContext] = useState<'student' | 'teacher' | 'compare'>('compare')
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [videoWidth, setVideoWidth] = useState(400)
  const [isVideoDragging, setIsVideoDragging] = useState(false)

  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      // 터치 디바이스이면서 1366px 이하이면 태블릿 (아이패드 프로 가로모드 포함)
      const tablet = !mobile && window.innerWidth <= 1366 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
      setIsMobile(mobile)
      setIsTablet(tablet)
      // 모바일이면 스크롤 모드 유지, 데스크탑이면 flip도 가능
      if (mobile) setViewMode('scroll')
      // 태블릿도 스크롤 모드 기본
      if (tablet) setViewMode('scroll')
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

      // Auto-enable split view and compare mode if teacher boards exist
      const hasTeacherBoards = matList.some(m => m.type === 'teacher_blackboard_image' || m.title?.startsWith('[T]'))
      if (hasTeacherBoards) {
        setIsSplitView(true)
        setViewContext('compare')
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

  // Sequential Pairing Logic (More Robust)
  const studentImages = images.filter(m => !(m.type === 'teacher_blackboard_image' || m.title?.startsWith('[T]')))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const teacherImages = images.filter(m => (m.type === 'teacher_blackboard_image' || m.title?.startsWith('[T]')))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const maxCount = Math.max(studentImages.length, teacherImages.length);
  const imageGroups = Array.from({ length: maxCount }, (_, i) => ({
    index: i,
    student: studentImages[i] || null,
    teacher: teacherImages[i] || null
  }));

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
  const showTwoPages = !isMobile && (isSplitView || currentImages.length > 1)

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

              {/* 보기 모드 전환 (학생 / 비교 / 선생님) - 데스크탑 헤더용 */}
              {isSplitView && !isMobile && !isTablet && (
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 mx-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewContext('student')}
                    className={cn(
                      "h-7 px-2.5 text-[10px] sm:text-xs font-medium transition-all",
                      viewContext === 'student' ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    학생
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewContext('compare')}
                    className={cn(
                      "h-7 px-2.5 text-[10px] sm:text-xs font-medium transition-all",
                      viewContext === 'compare' ? "bg-primary/20 text-primary-300" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    비교
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewContext('teacher')}
                    className={cn(
                      "h-7 px-2.5 text-[10px] sm:text-xs font-medium transition-all",
                      viewContext === 'teacher' ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    선생님
                  </Button>
                </div>
              )}

              {/* 뷰모드 - 데스크탑 전용 */}
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
                  onClick={() => setActiveVideo(videos[0].content_url)}
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

      {/* 모바일/태블릿 판서 전환 탭 바 */}
      {(isMobile || isTablet) && isSplitView && (
        <div className="relative bg-[#1a1a1f]/95 backdrop-blur-xl z-40 border-b border-white/5">
          <div className="flex">
            <button
              onClick={() => setViewContext('student')}
              className={cn(
                "flex-1 py-3 text-sm font-bold transition-all relative",
                viewContext === 'student'
                  ? "text-blue-400"
                  : "text-gray-500 active:bg-white/5"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  viewContext === 'student' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-gray-600"
                )} />
                학생 판서
              </span>
              {viewContext === 'student' && (
                <span className="absolute bottom-0 inset-x-4 h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setViewContext('compare')}
              className={cn(
                "flex-1 py-3 text-sm font-bold transition-all relative",
                viewContext === 'compare'
                  ? "text-violet-400"
                  : "text-gray-500 active:bg-white/5"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  viewContext === 'compare' ? "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "bg-gray-600"
                )} />
                비교
              </span>
              {viewContext === 'compare' && (
                <span className="absolute bottom-0 inset-x-4 h-[2px] bg-violet-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setViewContext('teacher')}
              className={cn(
                "flex-1 py-3 text-sm font-bold transition-all relative",
                viewContext === 'teacher'
                  ? "text-amber-400"
                  : "text-gray-500 active:bg-white/5"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  viewContext === 'teacher' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-gray-600"
                )} />
                선생님 판서
              </span>
              {viewContext === 'teacher' && (
                <span className="absolute bottom-0 inset-x-4 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Zoom modal removed - inline pinch-to-zoom on each image */}


      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'scroll' ? (
          <div className="h-full overflow-y-auto">
            <div className="p-2 sm:p-4 pb-32 space-y-4 max-w-7xl mx-auto">
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
                        <span className="flex items-center gap-2 text-[10px] text-gray-400">
                          <ZoomIn className="h-3 w-3" /> 터치하여 확대
                        </span>
                      </div>
                      {/* 모바일: 세로 스택, 데스크탑: 가로 나란히 */}
                      <div className={cn(
                        "grid gap-2 sm:gap-4 p-2 sm:p-4",
                        viewContext === 'compare' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                      )}>
                        {/* Student Board - Now on the LEFT */}
                        {(viewContext === 'student' || viewContext === 'compare') && (
                          <div className="flex flex-col bg-[#1e1e24] p-2 sm:p-3 rounded-xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-3 w-fit px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">학생 판서</span>
                            </div>
                            {group.student ? (
                              <div className="rounded-lg overflow-hidden border border-white/5">
                                <ZoomableImage src={group.student.content_url} alt="Student board" className="w-full h-auto" />
                              </div>
                            ) : (
                              <div className="flex-1 min-h-[200px] rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-[11px] text-center p-4">
                                학생 판서 자료가 <br /> 등록되지 않았습니다
                              </div>
                            )}
                          </div>
                        )}

                        {/* Teacher Board - Now on the RIGHT */}
                        {(viewContext === 'teacher' || viewContext === 'compare') && (
                          <div className="flex flex-col bg-[#1e1e24] p-2 sm:p-3 rounded-xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-3 w-fit px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">선생님 판서</span>
                            </div>
                            {group.teacher ? (
                              <div className="rounded-lg overflow-hidden border border-white/5">
                                <ZoomableImage src={group.teacher.content_url} alt="Teacher board" className="w-full h-auto" />
                              </div>
                            ) : (
                              <div className="flex-1 min-h-[200px] rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-[11px] text-center p-4">
                                선생님 판서 자료가 <br /> 등록되지 않았습니다
                              </div>
                            )}
                          </div>
                        )}
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
                    (() => {
                      const pages = [];
                      // 0. Cover Page (Alone on Right)
                      pages.push(
                        <div key="cover" className="page">
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center p-8">
                            <div className="text-center">
                              <BookOpen className="h-16 w-16 text-primary/20 mx-auto mb-4" />
                              <h2 className="text-xl font-bold text-slate-400">학습 결과 비교</h2>
                              <p className="text-sm text-slate-300">학생과 선생님의 판서를 <br />넘겨보며 비교해 보세요</p>
                            </div>
                          </div>
                        </div>
                      );
                      // 1. Placeholder to make next page LEFT (Page 1)
                      // Actually, if Page 0 is Cover (Right), then Page 1 is Left, Page 2 is Right.
                      // Wait. In react-pageflip showCover:true: 
                      // Page 0 = Cover (Right)
                      // Page 1 = Left, Page 2 = Right
                      // So Group 0 (S, T) should be Page 1 and Page 2.

                      imageGroups.forEach((group, index) => {
                        // Student Board (Left)
                        pages.push(
                          <div key={`s-${index}`} className="page">
                            <div className="relative w-full h-full bg-white flex flex-col p-4 shadow-inner">
                              <div className="flex items-center gap-2 mb-3 w-fit px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">학생 판서</span>
                              </div>
                              {group.student ? (
                                <img src={group.student.content_url} className="flex-1 w-full h-full object-contain" alt="Student" />
                              ) : (
                                <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 text-xs text-center border-2 border-dashed border-slate-100 rounded-xl">학생 판서 없음</div>
                              )}
                              <div className="mt-4 text-[10px] text-slate-300 font-mono text-center">PAGE {index + 1} - Student</div>
                            </div>
                          </div>
                        );
                        // Teacher Board (Right)
                        pages.push(
                          <div key={`t-${index}`} className="page">
                            <div className="relative w-full h-full bg-white flex flex-col p-4 shadow-inner">
                              <div className="flex items-center gap-2 mb-3 w-fit px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">선생님 판서</span>
                              </div>
                              {group.teacher ? (
                                <img src={group.teacher.content_url} className="flex-1 w-full h-full object-contain" alt="Teacher" />
                              ) : (
                                <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 text-xs text-center border-2 border-dashed border-slate-100 rounded-xl">선생님 판서 없음</div>
                              )}
                              <div className="mt-4 text-[10px] text-slate-300 font-mono text-center">PAGE {index + 1} - Teacher</div>
                            </div>
                          </div>
                        );
                      });
                      return pages;
                    })()
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

      {/* 풋터 - 모바일 최적화 (페이지 번호만 표시) */}
      <footer className="relative bg-[#18181b]/80 backdrop-blur-xl px-4 py-3 border-t border-white/10 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-1 sm:px-2 pt-1 pb-safe max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm font-bold text-gray-200 font-mono">
            {currentPage + 1} <span className="text-gray-500 font-normal tracking-wider">/ {currentImages.length}</span>
          </span>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prev = Math.max(0, currentPage - 1);
                goToPage(prev);
                setCurrentPage(prev);
              }}
              disabled={currentPage === 0}
              className="h-8 px-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = Math.min(currentImages.length - 1, currentPage + 1);
                goToPage(next);
                setCurrentPage(next);
              }}
              disabled={currentPage >= currentImages.length - 1}
              className="h-8 px-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>

      {/* Floating Video Player */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsVideoDragging(true)}
            onDragEnd={() => setIsVideoDragging(false)}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ touchAction: "none", width: videoWidth }}
            className="group fixed bottom-24 right-4 sm:right-10 z-[100] bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#18181b]/95 backdrop-blur-md border-b border-white/10 cursor-move">
              <span className="text-[10px] font-bold text-gray-200 flex items-center gap-2 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                수업 영상
              </span>
              <button
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={() => setActiveVideo(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div
              className="relative pt-[56.25%] w-full bg-black group"
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              {(() => {
                const isYouTube = activeVideo.includes('youtube.com') || activeVideo.includes('youtu.be');
                let embedUrl = activeVideo;
                if (isYouTube) {
                  const videoId = activeVideo.includes('v=')
                    ? activeVideo.split('v=')[1].split('&')[0]
                    : activeVideo.split('/').pop()?.split('?')[0];
                  embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=0&showinfo=0&fs=1&playsinline=1`;
                }

                return isYouTube ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <iframe
                      src={embedUrl}
                      className="absolute border-0"
                      style={{ top: '-1px', left: '-1px', width: 'calc(100% + 2px)', height: 'calc(100% + 2px)' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                    />
                    {/* Top shield: blocks YouTube title + logo (shows on hover) */}
                    <div
                      className="absolute top-0 left-0 w-full z-10 cursor-default"
                      style={{ height: '60px' }}
                      onClick={(e) => e.preventDefault()}
                    />
                    {/* Bottom-right shield: blocks YouTube logo watermark */}
                    <div
                      className="absolute bottom-0 right-0 z-10 cursor-default"
                      style={{ width: '160px', height: '60px' }}
                      onClick={(e) => e.preventDefault()}
                    />
                    {/* Bottom-left shield: blocks channel info area */}
                    <div
                      className="absolute bottom-0 left-0 z-10 cursor-default"
                      style={{ width: 'calc(100% - 160px)', height: '28px' }}
                      onClick={(e) => e.preventDefault()}
                    />
                  </div>
                ) : (
                  <video
                    src={activeVideo}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute top-0 left-0 w-full h-full outline-none"
                    autoPlay
                  />
                );
              })()}
              {/* Overlay to prevent iframe from swallowing pointer events during drag or resize */}
              {isVideoDragging && <div className="absolute inset-0 z-10" />}
            </div>

            {/* Resize Handle (Bottom-Right) */}
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const target = e.currentTarget;
                target.setPointerCapture(e.pointerId);

                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = videoWidth;
                const aspectRatio = 9 / 16;
                const diagonalSq = 1 + aspectRatio * aspectRatio;

                const onPointerMove = (moveEvent: PointerEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  const projection = (deltaX * 1 + deltaY * aspectRatio) / diagonalSq;
                  const newWidth = Math.max(250, Math.min(window.innerWidth * 0.9, startWidth + projection));
                  setVideoWidth(newWidth);
                };

                const onPointerUp = (upEvent: PointerEvent) => {
                  target.releasePointerCapture(upEvent.pointerId);
                  window.removeEventListener('pointermove', onPointerMove);
                  window.removeEventListener('pointerup', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
              }}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-center justify-center group/resize"
            >
              <div className="w-1.5 h-1.5 bg-white/20 rounded-full group-hover/resize:bg-primary transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
