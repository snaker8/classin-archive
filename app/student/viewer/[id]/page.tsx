'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useMediaQuery } from 'react-responsive'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { supabase, getCurrentUser, Class, Material } from '@/lib/supabase/client'
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
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
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
      const user = await getCurrentUser()
      if (!user) return

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('student_id', user.id)
        .single()

      if (classError) throw classError
      setClassInfo(classData)

      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('class_id', classId)
        .order('order_index', { ascending: true })

      if (materialsError) throw materialsError
      setMaterials(materialsData || [])
    } catch (error) {
      console.error('Error loading class data:', error)
      router.push('/student/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const images = materials.filter(m => m.type === 'blackboard_image')
  const videos = materials.filter(m => m.type === 'video_link')

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data)
  }, [])

  const nextPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext()
    }
  }

  const prevPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev()
    }
  }

  const goToPage = (pageIndex: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(pageIndex)
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
  }, [])

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

  if (!classInfo || images.length === 0) {
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
  const showTwoPages = !isMobile && images.length > 1

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-sm text-white px-4 py-3 border-b border-gray-700">
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
              <h1 className="text-base sm:text-lg font-semibold">{classInfo.title}</h1>
              <p className="text-xs sm:text-sm text-gray-300">{formatDate(classInfo.class_date)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
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

          {/* Navigation Arrows (Desktop/Tablet only) */}
          {!isMobile && (
            <>
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="absolute left-[-60px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
              <button
                onClick={nextPage}
                disabled={currentPage >= images.length - (showTwoPages ? 2 : 1)}
                className="absolute right-[-60px] top-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>
            </>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-gray-800/95 backdrop-blur-sm text-white px-4 py-3 border-t border-gray-700">
        <div className="max-w-7xl mx-auto">
          {/* Page Counter */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">
              페이지 {currentPage + 1} / {images.length}
            </div>

            {/* Mobile Navigation */}
            {isMobile && (
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
              {isMobile ? '좌우로 스와이프' : '화살표 키로 이동'} • 더블클릭으로 확대
            </div>
          </div>

          {/* Thumbnail Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => goToPage(index)}
                className={`relative flex-shrink-0 transition-all ${currentPage === index
                  ? 'ring-2 ring-primary scale-110'
                  : 'opacity-60 hover:opacity-100'
                  }`}
              >
                <img
                  src={image.content_url}
                  alt={`Page ${index + 1}`}
                  className="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded border-2 border-gray-600"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs text-center py-0.5">
                  {index + 1}
                </div>
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
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
