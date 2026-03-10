'use client'
// FORCE CACHE BUST: 2026-01-18T13:51:00Z

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Class, Material } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Dynamic import for HTMLFlipBook to avoid SSR issues
const HTMLFlipBook = dynamic(
  () => import('react-pageflip').then((mod) => mod.default as any),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>칠판 닦는 중...</p>
        </div>
      </div>
    ),
  }
) as any

// Lazy Image Component for Manual Virtualization
const VisibleImage = ({ src, index }: { src: string; index: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, {
      rootMargin: '200px 0px', // Load when 200px away
      threshold: 0.01
    })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="relative w-full bg-white shadow-lg rounded-lg overflow-hidden shrink-0"
      style={{ minHeight: '300px' }} // Minimum height to prevent total collapse
    >
      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">
        {index + 1}
      </div>

      {isVisible ? (
        <img
          src={src}
          alt={`Page ${index + 1}`}
          className="w-full h-auto"
          loading="eager" // Managed by JS, so load eagerly when mounted
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      ) : (
        <div className="flex items-center justify-center p-20 text-gray-300">
          <p>페이지 {index + 1} 로딩 대기중...</p>
        </div>
      )}
    </div>
  )
}

// Page Component for FlipBook
const Page = ({ imageUrl, pageNumber }: { imageUrl: string; pageNumber: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <div className="relative w-full h-full bg-white shadow-lg overflow-hidden">
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-gray-600">칠판 닦는 중...</p>
          </div>
        </div>
      )}

      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">📝</div>
            <p className="font-medium">자료 없음</p>
            <p className="text-sm mt-2">이미지를 불러올 수 없습니다</p>
          </div>
        </div>
      )}

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        doubleClick={{ mode: 'toggle' }}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full flex items-center justify-center"
            >
              <img
                src={imageUrl}
                alt={`Page ${pageNumber}`}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                style={{ display: imageLoaded && !imageError ? 'block' : 'none' }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            </TransformComponent>

            {/* Zoom Controls */}
            {imageLoaded && !imageError && (
              <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-10">
                <button
                  onClick={() => zoomIn()}
                  className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                  title="확대"
                >
                  <ZoomIn className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                  title="축소"
                >
                  <ZoomOut className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                  title="초기화"
                >
                  <RotateCcw className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            )}
          </>
        )}
      </TransformWrapper>

      {/* Page Number */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
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

  // Default to 'scroll' for checked stability, can toggle to 'flip'
  const [viewMode, setViewMode] = useState<'flip' | 'scroll'>('scroll')

  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [videoWidth, setVideoWidth] = useState(400)
  const [isVideoDragging, setIsVideoDragging] = useState(false)
  const flipBookRef = useRef<any>(null)

  // SSR-safe responsive detection
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true) // Default to desktop for SSR

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width <= 768)
      setIsTablet(width > 768 && width <= 1024)
      setIsDesktop(width > 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
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
      setMaterials(materials || [])
    } catch (error: any) {
      console.error('Error loading class data:', error)
      setErrorMsg(error.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const studentImages = materials.filter(m => m.type === 'blackboard_image' && !m.title?.startsWith('[T]'))
  const teacherImages = materials.filter(m => m.type === 'teacher_blackboard_image' || (m.type === 'blackboard_image' && m.title?.startsWith('[T]')))
  const videos = materials.filter(m => m.type === 'video_link')

  const [boardMode, setBoardMode] = useState<'student' | 'teacher' | 'compare'>('student')

  // Auto-switch modes based on available content
  useEffect(() => {
    if (studentImages.length === 0 && teacherImages.length > 0) {
      setBoardMode('teacher')
    } else if (studentImages.length > 0 && teacherImages.length > 0) {
      // If both exist, default to compare mode for the best UX
      setBoardMode('compare')
    }
  }, [materials.length]) // Use length as trigger for simplicity after sets

  // In compare mode, we use the larger length to determine pages
  const images = boardMode === 'student' ? studentImages
    : boardMode === 'teacher' ? teacherImages
      : (studentImages.length > teacherImages.length ? studentImages : teacherImages)

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
      // Scroll to that element if in scroll mode
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage()
      if (e.key === 'ArrowRight') nextPage()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewMode]) // Dependency added for viewMode

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">수업 자료를 불러오는 중...</p>
          <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2 text-red-600">오류 발생</h2>
          <p className="text-muted-foreground mb-6">
            {errorMsg}
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전 페이지로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (!classInfo || (images.length === 0 && videos.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold mb-2">수업 자료가 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            선생님께서 자료를 업로드하면 여기에 표시됩니다.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전 페이지로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  // Calculate dimensions based on screen size
  const getBookDimensions = () => {
    if (isMobile) {
      return { width: window.innerWidth - 32, height: window.innerHeight - 180 }
    }
    if (isTablet) {
      return { width: 500, height: 700 }
    }
    return { width: 600, height: 800 }
  }

  const { width, height } = getBookDimensions()
  const showTwoPages = !isMobile && images.length > 1

  return (
    <div className="fixed inset-0 bg-[#0f0f13] text-gray-100 flex flex-col font-sans selection:bg-primary/30">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
      </div>

      {/* Header */}

      <header className="relative bg-[#18181b]/80 backdrop-blur-xl px-4 py-3 border-b border-white/10 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                {classInfo.title}
                {boardMode === 'teacher' && <span className="text-xs bg-amber-600 px-2 py-0.5 rounded text-white ml-2">선생님 판서</span>}
                {boardMode === 'student' && teacherImages.length > 0 && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white ml-2">학생 판서</span>}
                {boardMode === 'compare' && <span className="text-xs bg-purple-600 px-2 py-0.5 rounded text-white ml-2">비교 학습</span>}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">{formatDate(classInfo.class_date)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(studentImages.length > 0 && teacherImages.length > 0) && (
              <div className="flex bg-[#27272a]/80 backdrop-blur-md rounded-full p-1 mr-4 border border-white/5 shadow-inner">
                <button
                  onClick={() => setBoardMode('student')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${boardMode === 'student'
                    ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                  학생
                </button>
                <button
                  onClick={() => setBoardMode('compare')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 mx-1 ${boardMode === 'compare'
                    ? 'bg-primary/20 text-primary-300 ring-1 ring-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                  비교
                </button>
                <button
                  onClick={() => setBoardMode('teacher')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${boardMode === 'teacher'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                  선생님
                </button>
              </div>
            )}

            {boardMode !== 'compare' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(prev => prev === 'flip' ? 'scroll' : 'flip')}
                className="text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 mr-2 rounded-full"
              >
                {viewMode === 'flip' ? '📜 스크롤 보기' : '📖 책 넘김 보기'}
              </Button>
            )}

            {videos.length > 0 && (
              <Button
                size="sm"
                onClick={() => setActiveVideo(videos[0].content_url)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full group transition-all"
              >
                <div className="bg-red-500 rounded-full p-1 mr-2 group-hover:scale-110 transition-transform">
                  <Play className="h-3 w-3 text-white fill-current" />
                </div>
                <span className="hidden sm:inline font-medium">{videos[0].title || '수업 영상'}</span>
                <span className="sm:hidden font-medium">영상</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-white hover:bg-white/10 hidden sm:flex rounded-full px-2"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Viewer */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        <div className="relative w-full h-full flex items-center justify-center">
          {images.length === 0 && videos.length > 0 ? (
            // ... (Video Only View - unchanged)
            <div className="text-center">
              <div className="mb-6">
                <Play className="h-20 w-20 text-red-600 mx-auto opacity-80" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">동영상 강의</h2>
              <p className="text-gray-400 mb-6">이 수업은 칠판 판서 없이 동영상으로만 구성되어 있습니다.</p>
              <Button
                size="lg"
                onClick={() => setActiveVideo(videos[0].content_url)}
                className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 h-auto"
              >
                <Play className="h-6 w-6 mr-3" />
                {videos[0].title || '영상 재생하기'}
                <ExternalLink className="h-5 w-5 ml-3" />
              </Button>
            </div>
          ) : boardMode === 'compare' ? (
            // COMPARE VIEW (Split Screen)
            <div className="w-full h-full flex flex-col md:flex-row gap-6 overflow-hidden max-w-[1800px] mx-auto">
              {/* Left/Top: Student */}
              <div className="flex-1 flex flex-col bg-[#18181b]/60 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/40 to-blue-400/10" />
                <div className="p-3 bg-blue-500/5 text-blue-300 text-center text-sm font-semibold border-b border-white/5 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  학생 판서
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
                  {studentImages.map((image, index) => (
                    <div key={image.id} className="w-full bg-[#1e1e24] p-2 rounded-xl border border-white/5 shadow-inner" id={`student-page-${index}`}>
                      <div className="mb-2 px-1 text-xs text-gray-500 font-medium tracking-wide font-mono">Page {index + 1}</div>
                      <VisibleImage src={image.content_url} index={index} />
                    </div>
                  ))}
                  {studentImages.length === 0 && (
                    <div className="h-full flex items-center justify-center flex-col text-gray-600 gap-3">
                      <div className="p-4 rounded-full bg-white/5"><Loader2 className="h-6 w-6 animate-pulse" /></div>
                      <span>자료 없음</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right/Bottom: Teacher */}
              <div className="flex-1 flex flex-col bg-[#18181b]/60 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/40 to-amber-400/10" />
                <div className="p-3 bg-amber-500/5 text-amber-300 text-center text-sm font-semibold border-b border-white/5 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  선생님 판서
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
                  {teacherImages.map((image, index) => (
                    <div key={image.id} className="w-full bg-[#1e1e24] p-2 rounded-xl border border-white/5 shadow-inner" id={`teacher-page-${index}`}>
                      <div className="mb-2 px-1 text-xs text-gray-500 font-medium tracking-wide font-mono">Page {index + 1}</div>
                      <VisibleImage src={image.content_url} index={index} />
                    </div>
                  ))}
                  {teacherImages.length === 0 && (
                    <div className="h-full flex items-center justify-center flex-col text-gray-600 gap-3">
                      <div className="p-4 rounded-full bg-white/5"><Loader2 className="h-6 w-6 animate-pulse" /></div>
                      <span>자료 없음</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          ) : viewMode === 'scroll' ? (
            <div className="w-full h-full overflow-y-auto overflow-x-hidden p-4 space-y-4 flex flex-col items-center">
              {images.map((image, index) => (
                <div id={`page-${index}`} key={image.id} className="max-w-3xl w-full">
                  <VisibleImage src={image.content_url} index={index} />
                </div>
              ))}
              <div className="h-20 shrink-0" /> {/* Spacer */}
            </div>
          ) : (
            <div className="relative">
              {typeof window !== 'undefined' && (
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={width}
                  height={height}
                  size="stretch"
                  minWidth={300}
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
                  maxShadowOpacity={0.5}
                  mobileScrollSupport={true}
                  onFlip={onFlip}
                  onChangeOrientation={() => { }}
                  onChangeState={() => { }}
                >
                  {images.map((image, index) => (
                    <div key={image.id} className="page">
                      <Page
                        imageUrl={image.content_url}
                        pageNumber={index + 1}
                      />
                    </div>
                  ))}
                </HTMLFlipBook>
              )}

              {/* Navigation Arrows (Desktop/Tablet only) - Flip Mode Only */}
              {!isMobile && (
                <>
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="absolute left-[-60px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={currentPage >= images.length - (showTwoPages ? 2 : 1)}
                    className="absolute right-[-60px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="relative bg-[#18181b]/80 backdrop-blur-xl px-4 py-3 border-t border-white/10 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto">
          {/* Page Counter */}
          <div className="flex items-center justify-between mb-3">
            {boardMode === 'compare' ? (
              <div className="text-sm font-medium text-gray-300">
                비교 학습 모드 (스크롤하여 확인하세요)
              </div>
            ) : (
              <div className="text-sm font-medium">
                페이지 {currentPage + 1} / {images.length}
              </div>
            )}

            {/* Mobile Navigation - Only for Flip Mode */}
            {isMobile && viewMode === 'flip' && boardMode !== 'compare' && (
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage >= images.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="text-xs text-gray-400 hidden sm:block">
              {boardMode === 'compare' ? '양쪽 패널을 각각 스크롤할 수 있습니다' :
                viewMode === 'flip'
                  ? (isMobile ? '좌우로 스와이프' : '화살표 키로 이동 • 더블클릭으로 확대')
                  : '스크롤하여 보기'
              }
            </div>
          </div>

          {/* Thumbnail Navigation */}
          {boardMode !== 'compare' && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => goToPage(index)}
                  className={`group relative flex-shrink-0 transition-all duration-300 rounded-lg overflow-hidden ${currentPage === index
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#18181b] scale-[1.05] shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    : 'opacity-50 hover:opacity-100'
                    }`}
                >
                  <img
                    src={image.content_url}
                    alt={`Page ${index + 1}`}
                    className="w-14 h-20 sm:w-16 sm:h-24 object-cover border border-white/10"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <div className={`absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${currentPage === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  <div className={`absolute bottom-1 w-full text-center text-[10px] sm:text-xs font-medium text-white transition-opacity ${currentPage === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {index + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        .flip-book {
          margin: 0 auto;
        }
        .page {
          background-color: white;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
        }
      `}</style>
      {/* Floating Video Player */}
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
          className="group fixed top-20 left-[calc(100%-420px)] z-[100] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#18181b]/95 backdrop-blur-md border-b border-white/10 cursor-move">
            <span className="text-xs font-semibold text-gray-200 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              동영상 강의
            </span>
            <button
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={() => setActiveVideo(null)}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
                  />
                  {/* Click Shields to prevent YouTube link escape */}
                  <div
                    className="absolute top-0 left-0 w-full h-[52px] z-10 cursor-default"
                    onClick={(e) => e.preventDefault()}
                  />
                  <div
                    className="absolute bottom-8 right-0 w-[140px] h-[52px] z-10 cursor-default"
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
              const aspectRatio = 9 / 16; // Height is 56.25% of width
              const diagonalSq = 1 + aspectRatio * aspectRatio;

              const onPointerMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                // Project mouse movement exactly onto the 16:9 diagonal
                const projection = (deltaX * 1 + deltaY * aspectRatio) / diagonalSq;

                const newWidth = Math.max(250, Math.min(window.innerWidth * 0.9, startWidth + projection));
                setVideoWidth(newWidth);
              };

              const onPointerUp = (upEvent: PointerEvent) => {
                target.releasePointerCapture(upEvent.pointerId);
                target.removeEventListener('pointermove', onPointerMove);
                target.removeEventListener('pointerup', onPointerUp);
                document.body.style.userSelect = '';
              };

              document.body.style.userSelect = 'none';
              target.addEventListener('pointermove', onPointerMove);
              target.addEventListener('pointerup', onPointerUp);
            }}
            className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50 flex items-end justify-end p-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/60 rounded-tl-lg rounded-br-xl touch-none"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2L2 10M10 6L6 10" />
            </svg>
          </div>
        </motion.div>
      )}
    </div>
  )
}
