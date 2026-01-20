'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase, getCurrentUser, Profile } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload,
  X,
  GripVertical,
  Video as VideoIcon,
  Search,
  Calendar as CalendarIcon,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  GraduationCap
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Image from 'next/image'
import { createClass, createClassForGroup, createMaterials, uploadImage } from '@/app/actions/class'
import { getGroups } from '@/app/actions/group'

interface UploadedImage {
  id: string
  file: File
  preview: string
  order: number
}

interface FormData {
  studentId: string
  title: string
  description: string
  classDate: string
  videoUrl: string
  videoTitle: string
  teacherName: string
}

// Sortable Image Item Component
function SortableImageItem({ image, onRemove }: { image: UploadedImage; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-white rounded-lg border-2 border-gray-200 overflow-hidden"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-black bg-opacity-60 text-white p-1 rounded cursor-move hover:bg-opacity-80"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Delete Button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 bg-red-600 text-white p-1 rounded hover:bg-red-700"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Order Number */}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
        {image.order + 1}
      </div>

      {/* Image */}
      <img
        src={image.preview}
        alt={`Upload ${image.order + 1}`}
        className="w-full h-32 object-cover"
      />
    </div>
  )
}

export default function NewClassPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedStudent = searchParams.get('student')
  const { toast } = useToast()

  const [mode, setMode] = useState<'student' | 'group'>('student')

  const [students, setStudents] = useState<Profile[]>([])
  const [groups, setGroups] = useState<any[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)

  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)


  // ... existing code ...

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      classDate: new Date().toISOString().split('T')[0],
      title: `${new Date().toLocaleDateString('ko-KR')} 수업`,
      teacherName: '',
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadStudents()
    loadGroups()
  }, [])

  useEffect(() => {
    if (preselectedStudent && students.length > 0) {
      const student = students.find(s => s.id === preselectedStudent)
      if (student) {
        setMode('student')
        setSelectedStudent(student)
        setValue('studentId', student.id)
      }
    }
  }, [preselectedStudent, students])

  // Update title when date changes
  const watchDate = watch('classDate')
  useEffect(() => {
    if (watchDate) {
      const date = new Date(watchDate)
      setValue('title', `${date.toLocaleDateString('ko-KR')} 수업`)
    }
  }, [watchDate])

  const loadStudents = async () => {
    try {
      const { getStudents } = await import('@/app/actions/student')
      const { students } = await getStudents()
      setStudents(students)
    } catch (error) {
      console.error('Failed to load students', error)
    }
  }

  const loadGroups = async () => {
    try {
      const { groups } = await getGroups()
      setGroups(groups || [])
    } catch (error) {
      console.error('Failed to load groups', error)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        order: images.length + index,
      }))
      setImages([...images, ...newImages])
      toast({
        title: "이미지 추가됨",
        description: `${acceptedFiles.length}개의 이미지가 추가되었습니다.`,
      })
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        // Update order
        return newItems.map((item, index) => ({ ...item, order: index }))
      })
    }
  }

  const removeImage = (id: string) => {
    setImages((items) => {
      const newItems = items.filter((item) => item.id !== id)
      return newItems.map((item, index) => ({ ...item, order: index }))
    })
  }

  const onSubmit = async (data: FormData) => {
    // Validation
    if (mode === 'student' && !selectedStudent) {
      toast({ title: "학생을 선택하세요", variant: "destructive" })
      return
    }
    if (mode === 'group' && !selectedGroup) {
      toast({ title: "반을 선택하세요", variant: "destructive" })
      return
    }

    const hasImages = images.length > 0
    const hasVideo = !!data.videoUrl

    if (!hasImages && !hasVideo) {
      toast({
        title: "자료를 입력하세요",
        description: "칠판 이미지 또는 동영상 링크 중 하나 이상을 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Upload Images First (Once)
      // For Group mode, we could upload once and share URL, but standard logic uses studentId in path.
      // To satisfy existing logic (student folder structure), if in group mode, maybe upload to a generic 'group' folder or just pick the first student?
      // Actually, if we use `createClass`, the materials table stores the public URL.
      // The `folder-monitor` uses strict paths.
      // But manual upload can be flexible.
      // Let's stick to:
      // - Student Mode: `studentId/date/filename`
      // - Group Mode: `group/groupId/date/filename` (Clean separation)

      const bucketPath = mode === 'student'
        ? `${selectedStudent?.id}/${data.classDate}`
        : `group/${selectedGroup?.id}/${data.classDate}`

      const uploadedMaterials: any[] = []

      for (const [index, image] of images.entries()) {
        // Sanitize filename: replace non-ASCII characters with underscore, keep extension
        const extension = image.file.name.split('.').pop() || 'png'
        const baseName = image.file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")
        const safeFileName = baseName.length > 0 ? baseName : `image-${index}`
        const fileName = `${bucketPath}/${Date.now()}-${safeFileName}.${extension}` // Timestamp ensures uniqueness

        // Use Server Action for upload to bypass RLS
        const formData = new FormData()
        formData.append('file', image.file)
        formData.append('path', fileName)

        const { url, error: uploadError } = await uploadImage(formData)

        if (uploadError) throw new Error(uploadError)

        const isTeacherMaterial = data.teacherName && image.file.name.includes(data.teacherName)

        uploadedMaterials.push({
          type: isTeacherMaterial ? 'teacher_blackboard_image' : 'blackboard_image',
          content_url: url,
          order_index: image.order,
        })
      }

      // Add Video
      if (data.videoUrl) {
        uploadedMaterials.push({
          type: 'video_link',
          content_url: data.videoUrl,
          title: data.videoTitle || '수업 영상',
          // Video comes after all images
          order_index: images.length
        })
      }

      // 2. Create Classes
      if (mode === 'student') {
        // Single Student
        const { class: newClass, error } = await createClass({
          student_id: selectedStudent!.id,
          title: data.title,
          description: data.description,
          class_date: data.classDate,
        })
        if (error) throw new Error(error)

        // Insert Materials (Server Action)
        const materialsToInsert = uploadedMaterials.map(m => ({ ...m, class_id: newClass.id }))
        const { error: matError } = await createMaterials(materialsToInsert)
        if (matError) throw new Error(matError)

        toast({ title: "업로드 완료! 🎉", description: `${selectedStudent!.full_name}의 수업 등록 완료.` })

      } else {
        // Group Mode
        // First, create classes for all students in group
        const { classes, error } = await createClassForGroup(selectedGroup!.id, {
          title: data.title,
          description: data.description,
          class_date: data.classDate
        })

        if (error) throw new Error(error)

        // Now Insert Materials for EACH class created
        const materialInserts = []
        const createdClasses = classes || []
        for (const cls of createdClasses) {
          for (const m of uploadedMaterials) {
            materialInserts.push({ ...m, class_id: cls.id })
          }
        }

        // Batch insert materials (Server Action)
        if (materialInserts.length > 0) {
          const { error: matError } = await createMaterials(materialInserts)
          if (matError) throw new Error(matError)
        }

        toast({ title: "반 일괄 업로드 완료! 🎉", description: `${selectedGroup!.name} (${createdClasses.length}명) 수업 등록 완료.` })
      }


      // Reset form
      setImages([])
      setSelectedStudent(null)
      setSelectedGroup(null) // Reset group too
      setValue('title', `${new Date().toLocaleDateString('ko-KR')} 수업`)
      setValue('description', '')
      setValue('videoUrl', '')
      setValue('videoTitle', '')

      // Go back to dashboard after a short delay
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
    } catch (error: any) {
      console.error('Error uploading class:', error)
      toast({
        title: "업로드 실패",
        description: error.message || '업로드 중 오류가 발생했습니다.',
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Filter Logic
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasContent = images.length > 0 || !!watch('videoUrl')

  return (
    <div className="flex h-[calc(100vh-88px)] gap-6">
      {/* Left Sidebar - Selector */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-lg">대상 선택</CardTitle>

          {/* Mode Toggle */}
          <div className="flex p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => { setMode('student'); setSearchQuery(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'student' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                학생
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setMode('group'); setSearchQuery(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'group' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                반(그룹)
              </div>
            </button>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={mode === 'student' ? "학생 검색..." : "반 검색..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {mode === 'student' ? (
              // Student List
              filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student)
                    setValue('studentId', student.id)
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedStudent?.id === student.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-gray-100'
                    }`}
                >
                  <div className="font-medium">{student.full_name}</div>
                  <div className={`text-xs ${selectedStudent?.id === student.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {student.email}
                  </div>
                </button>
              ))
            ) : (
              // Group List
              filteredGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(group)
                    // Auto-fill teacher name if assigned
                    // teacher can be an object or array depending on Supabase response structure, usually object for Many-to-One
                    const teacher = Array.isArray(group.teacher) ? group.teacher[0] : group.teacher
                    if (teacher?.name) {
                      setValue('teacherName', teacher.name)
                      toast({ title: "담임 선생님 자동 선택", description: `${teacher.name} 선생님이 자동으로 입력되었습니다.` })
                    } else {
                      setValue('teacherName', '') // Reset if no teacher
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedGroup?.id === group.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-gray-100'
                    }`}
                >
                  <div className="font-medium">{group.name}</div>
                  <div className={`text-xs ${selectedGroup?.id === group.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    학생 {group.members?.[0]?.count || 0}명
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Main Area - Upload Form */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">수업 자료 업로드</h2>
              {mode === 'student' && selectedStudent && (
                <p className="text-muted-foreground mt-1">
                  <span className="font-bold text-primary">{selectedStudent.full_name}</span> 학생에게 업로드합니다.
                </p>
              )}
              {mode === 'group' && selectedGroup && (
                <p className="text-muted-foreground mt-1">
                  <span className="font-bold text-primary">{selectedGroup.name}</span> 소속 학생 전원에게 업로드합니다.
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/dashboard')}
            >
              취소
            </Button>
          </div>

          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수업 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    수업 날짜
                  </label>
                  <Input type="date" {...register('classDate')} required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">수업 제목</label>
                  <Input {...register('title')} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  선생님 성함 (선택)
                </label>
                <div className="flex gap-2">
                  <Input
                    {...register('teacherName')}
                    placeholder="파일명에 이 이름이 포함되면 선생님 판서로 자동 분류됩니다."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  예: '홍길동' 입력 시, '홍길동_판서1.png'는 선생님 자료로 등록됩니다.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">수업 설명 (선택)</label>
                <textarea
                  {...register('description')}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                  placeholder="수업 내용 요약"
                />
              </div>
            </CardContent>
          </Card>

          {/* Video Link Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <VideoIcon className="h-5 w-5 mr-2 text-red-600" />
                ClassIn 녹화 링크
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  {...register('videoUrl')}
                  placeholder="https://www.classin.com/..."
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Input
                  {...register('videoTitle')}
                  placeholder="영상 제목 (선택, 기본값: '수업 영상')"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">칠판 판서 이미지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary'
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-lg font-medium text-primary">
                    여기에 이미지를 놓으세요...
                  </p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">
                      이미지를 드래그하거나 클릭하여 업로드
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG, JPEG, GIF, WEBP 지원 • 여러 파일 동시 업로드 가능
                    </p>
                  </>
                )}
              </div>

              {/* Sortable Images Grid */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      업로드된 이미지 {images.length}개
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      미리보기
                    </Button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={images.map(img => img.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-4 gap-4">
                        {images.map((image) => (
                          <SortableImageItem
                            key={image.id}
                            image={image}
                            onRemove={() => removeImage(image.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <p className="text-xs text-muted-foreground">
                    💡 드래그하여 순서를 변경할 수 있습니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={uploading || (mode === 'student' && !selectedStudent) || (mode === 'group' && !selectedGroup) || !hasContent}
              className="min-w-[200px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {mode === 'group' ? '일괄 발행하기' : '발행하기'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>E-Book 미리보기</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg relative overflow-hidden">
            {images.length > 0 && (
              <>
                <Image
                  src={images[previewIndex].preview}
                  alt={`Preview ${previewIndex + 1}`}
                  width={800}
                  height={600}
                  className="max-h-full object-contain"
                />

                {/* Navigation */}
                {previewIndex > 0 && (
                  <button
                    onClick={() => setPreviewIndex(previewIndex - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {previewIndex < images.length - 1 && (
                  <button
                    onClick={() => setPreviewIndex(previewIndex + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                {/* Page Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
                  {previewIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
