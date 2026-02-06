'use client'
// FORCE CACHE BUST: 2026-01-18T13:51:00Z

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useMediaQuery } from 'react-responsive'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Class, Material } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  const flipBookRef = useRef<any>(null)

  // Responsive detection
  const isMobile = useMediaQuery({ maxWidth: 768 })
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 })
  const isDesktop = useMediaQuery({ minWidth: 1025 })

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

  const images = materials.filter(m => m.type === 'blackboard_image' || m.type === 'teacher_blackboard_image')
  const videos = materials.filter(m => m.type === 'video_link')

  // Group images by order_index for Split View
  const groupedImages = images.reduce((acc, img) => {
    const idx = img.order_index;
    if (!acc[idx]) acc[idx] = { student: null, teacher: null };
    if (img.type === 'teacher_blackboard_image') acc[idx].teacher = img;
    else acc[idx].student = img;
    return acc;
  }, {} as Record<number, { student: Material | null, teacher: Material | null }>);

  // Convert to sorted array of groups
  const imageGroups = Object.keys(groupedImages)
    .map(Number)
    .sort((a, b) => a - b)
    .map(idx => ({ index: idx, ...groupedImages[idx] }));

  // Flattened images for single view (Teacher high priority if exists)
  const displayImages = viewMode === 'scroll' || viewMode === 'flip'
    ? images.filter(m => m.type === 'blackboard_image') // Current logic keeps student images as primary
    : [];

  const [isSplitView, setIsSplitView] = useState(false);

  // Re-define images based on split view
  const currentImages = isSplitView ? imageGroups : images.filter(m => m.type === 'blackboard_image');


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
          <Button onClick={() => router.push('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (!classInfo || (images.length === 0 && !isSplitView)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold mb-2">수업 자료가 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            선생님께서 자료를 업로드하면 여기에 표시됩니다.
          </p>
          <Button onClick={() => router.push('/student/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
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
  const showTwoPages = !isMobile && currentImages.length > 1

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-sm text-white px-4 py-3 border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/student/dashboard')}
              className="text-white hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                {classInfo.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">{formatDate(classInfo.class_date)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={isSplitView ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsSplitView(!isSplitView)}
              className={`text-sm ${isSplitView ? 'bg-blue-600 hover:bg-blue-700' : 'text-white hover:bg-gray-700 border border-gray-600'}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-[1px]">
                  <div className="w-2 h-3 border border-current rounded-[1px]" />
                  <div className="w-2 h-3 border border-current rounded-[1px]" />
                </div>
                <span>분할 보기 {isSplitView ? 'ON' : 'OFF'}</span>
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(prev => prev === 'flip' ? 'scroll' : 'flip')}
              className="text-white hover:text-white hover:bg-gray-700 border border-gray-600 mr-2"
            >
              {viewMode === 'flip' ? '📜 스크롤 보기' : '📖 책 넘김 보기'}
            </Button>

            {videos.length > 0 && (
              <Button
                size="sm"
                onClick={() => window.open(videos[0].content_url, '_blank')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{videos[0].title || '수업 영상'}</span>
                <span className="sm:hidden">영상</span>
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:text-white hover:bg-gray-700 hidden sm:flex"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Viewer */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        <div className="relative w-full h-full flex items-center justify-center">
          {viewMode === 'scroll' ? (
            <div className="w-full h-full overflow-y-auto overflow-x-hidden p-4 space-y-4 flex flex-col items-center">
              {isSplitView ? (
                // Split View Scroll Mode
                imageGroups.map((group, index) => (
                  <div id={`page-${index}`} key={index} className="w-full max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Teacher Board */}
                      <div className="space-y-2">
                        <div className="text-center text-xs text-blue-400 font-bold uppercase tracking-wider bg-blue-900/30 py-1 rounded">Teacher Board</div>
                        {group.teacher ? (
                          <VisibleImage src={group.teacher.content_url} index={index} />
                        ) : (
                          <div className="bg-gray-800/50 rounded-lg h-[400px] flex items-center justify-center border-2 border-dashed border-gray-700 text-gray-500">
                            선생님 판서 없음
                          </div>
                        )}
                      </div>
                      {/* Student Board */}
                      <div className="space-y-2">
                        <div className="text-center text-xs text-green-400 font-bold uppercase tracking-wider bg-green-900/30 py-1 rounded">My Board</div>
                        {group.student ? (
                          <VisibleImage src={group.student.content_url} index={index} />
                        ) : (
                          <div className="bg-gray-800/50 rounded-lg h-[400px] flex items-center justify-center border-2 border-dashed border-gray-700 text-gray-500">
                            판서 없음
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Normal Scroll Mode
                currentImages.map((image: any, index: number) => (
                  <div id={`page-${index}`} key={image.id} className="max-w-3xl w-full">
                    <VisibleImage src={image.content_url} index={index} />
                  </div>
                ))
              )}
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
                  {isSplitView ? (
                    // Split View Flip Mode
                    imageGroups.map((group, index) => (
                      <div key={index} className="page">
                        <div className="relative w-full h-full bg-gray-900 flex flex-col p-2">
                          <div className="grid grid-rows-2 h-full gap-2">
                            <div className="relative bg-white rounded-lg overflow-hidden border-2 border-blue-500/30">
                              <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-0.5 text-[10px] z-10 font-bold">Teacher</div>
                              {group.teacher ? (
                                <img src={group.teacher.content_url} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">선생님 판서 없음</div>
                              )}
                            </div>
                            <div className="relative bg-white rounded-lg overflow-hidden border-2 border-green-500/30">
                              <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-0.5 text-[10px] z-10 font-bold">My Work</div>
                              {group.student ? (
                                <img src={group.student.content_url} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">나의 판서 없음</div>
                              )}
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">Page {index + 1}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Normal Flip Mode
                    currentImages.map((image: any, index: number) => (
                      <div key={image.id} className="page">
                        <Page
                          imageUrl={image.content_url}
                          pageNumber={index + 1}
                        />
                      </div>
                    ))
                  )}
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
                    disabled={currentPage >= currentImages.length - (showTwoPages ? 2 : 1)}
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
      <footer className="bg-gray-800/95 backdrop-blur-sm text-white px-4 py-3 border-t border-gray-700 z-50">
        <div className="max-w-7xl mx-auto">
          {/* Page Counter */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">
              페이지 {currentPage + 1} / {currentImages.length}
            </div>

            {/* Mobile Navigation - Only for Flip Mode */}
            {isMobile && viewMode === 'flip' && (
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
                  disabled={currentPage >= currentImages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="text-xs text-gray-400 hidden sm:block">
              {viewMode === 'flip'
                ? (isMobile ? '좌우로 스와이프' : '화살표 키로 이동 • 더블클릭으로 확대')
                : '스크롤하여 보기'
              }
            </div>
          </div>

          {/* Thumbnail Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {currentImages.map((item: any, index: number) => (
              <button
                key={isSplitView ? index : item.id}
                onClick={() => goToPage(index)}
                className={`relative flex-shrink-0 transition-all ${currentPage === index
                  ? 'ring-2 ring-primary scale-110'
                  : 'opacity-60 hover:opacity-100'
                  }`}
              >
                <img
                  src={isSplitView ? (item.student?.content_url || item.teacher?.content_url) : item.content_url}
                  alt={`Page ${index + 1}`}
                  className="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded border-2 border-gray-600"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs text-center py-0.5">
                  {index + 1}
                </div>
                {isSplitView && item.teacher && item.student && (
                  <div className="absolute top-0 right-0 bg-blue-500 w-2 h-2 rounded-full border border-white" />
                )}
              </button>
            ))}
          </div>
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
    </div>
  )
}
