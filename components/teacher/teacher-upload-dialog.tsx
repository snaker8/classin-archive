'use client'

import { useState, useCallback, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Upload, Loader2, CheckCircle2, AlertCircle, X, FileText, Calendar as CalendarIcon, UploadCloud } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { getAllClasses, uploadImage, createMaterials } from '@/app/actions/class'
import { registerManualVideoBatch } from '@/app/actions/video-archive'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface TeacherUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    teacherId?: string
}

export function TeacherUploadDialog({ open, onOpenChange, onSuccess, teacherId }: TeacherUploadDialogProps) {
    const { toast } = useToast()

    // Selection State
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [classes, setClasses] = useState<any[]>([])
    const [loadingClasses, setLoadingClasses] = useState(false)
    const [selectedClassId, setSelectedClassId] = useState<string>('')

    // File State
    const [files, setFiles] = useState<File[]>([])

    // Upload State
    const [uploading, setUploading] = useState(false)
    const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
    const [progress, setProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState('')

    // Load classes when date changes
    useEffect(() => {
        if (open && date) {
            loadClasses(date)
        } else if (!open) {
            // Reset state on close
            setFiles([])
            setSelectedClassId('')
            setUploadStep('idle')
            setProgress(0)
            setErrorMessage('')
            // Don't reset date to keep context
        }
    }, [open, date])

    async function loadClasses(selectedDate: Date) {
        setLoadingClasses(true)
        setSelectedClassId('') // Reset selection
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const res = await getAllClasses({ limit: 500, date: dateStr, teacherId })
            if (res.classes) {
                const groups = res.classes.reduce((acc: any, cls: any) => {
                    if (!acc[cls.title]) {
                        acc[cls.title] = {
                            id: cls.id, // Use the first class's ID to represent the group
                            title: cls.title,
                            created_at: cls.created_at,
                            studentCount: 0,
                            students: []
                        }
                    }
                    acc[cls.title].studentCount++
                    const studentName = cls.student?.full_name || '학생 미지정'
                    if (!acc[cls.title].students.includes(studentName)) {
                        acc[cls.title].students.push(studentName)
                    }
                    return acc
                }, {})
                setClasses(Object.values(groups))
            }
        } catch (error) {
            console.error('Failed to load classes', error)
            toast({
                title: '수업 목록 로드 실패',
                description: '수업 목록을 불러오는데 실패했습니다.',
                variant: 'destructive',
            })
        } finally {
            setLoadingClasses(false)
        }
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles])
        setUploadStep('idle')
    }, [])

    const onDropRejected = useCallback(() => {
        const acceptedTypes = "PDF, PPTX, MP4, 및 이미지 파일(.png, .jpg 등)"
        toast({
            title: "업로드 대상 아님",
            description: `지원하지 않는 파일 형식입니다. ${acceptedTypes}만 업로드할 수 있습니다.`,
            variant: "destructive"
        })
    }, [toast]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'video/mp4': ['.mp4']
        },
        disabled: uploading
    })

    async function handleUpload() {
        if (files.length === 0 || !selectedClassId) return

        setUploading(true)
        setUploadStep('uploading')
        setProgress(0)
        setErrorMessage('')

        try {
            const uploadedMaterials = []
            const videoFiles: File[] = []
            const otherFiles: File[] = []

            // Separate video files for chunked upload
            files.forEach(file => {
                if (file.type === 'video/mp4') {
                    videoFiles.push(file)
                } else {
                    otherFiles.push(file)
                }
            })

            const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
            const batchId = crypto.randomUUID()
            const uploadedVideos: { path: string, name: string }[] = []

            // 1. Handle Video Files (Chunked Upload)
            if (videoFiles.length > 0) {
                const { data: { session } } = await supabase.auth.getSession();
                let currentToken = session?.access_token;

                for (let i = 0; i < videoFiles.length; i++) {
                    const file = videoFiles[i];
                    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                    let lastResult;

                    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                        const start = chunkIndex * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, file.size);
                        const chunk = file.slice(start, end);

                        const formData = new FormData();
                        formData.append('chunk', chunk);
                        formData.append('chunkIndex', chunkIndex.toString());
                        formData.append('totalChunks', totalChunks.toString());
                        formData.append('chunkSize', CHUNK_SIZE.toString());
                        formData.append('filename', file.name);
                        formData.append('batchId', batchId);
                        formData.append('classId', selectedClassId);

                        let uploadRes = await fetch('/api/upload/chunk', {
                            method: 'POST',
                            body: formData,
                            headers: currentToken ? {
                                'Authorization': `Bearer ${currentToken}`
                            } : undefined
                        });

                        if (uploadRes.status === 401) {
                            const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
                            if (sessionError || !sessionData.session) throw new Error('세션 만료: 다시 로그인해 주세요.');
                            currentToken = sessionData.session.access_token;
                            uploadRes = await fetch('/api/upload/chunk', {
                                method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${currentToken}` }
                            });
                        }

                        if (!uploadRes.ok) throw new Error(`영상 업로드 실패: ${file.name} (${uploadRes.status})`);
                        lastResult = await uploadRes.json();

                        // Update progress realistically based on total files
                        const filesProgress = (i + (chunkIndex + 1) / totalChunks) / files.length;
                        setProgress(Math.round(filesProgress * 100));
                    }
                    uploadedVideos.push({ path: lastResult.localPath, name: file.name });
                }

                setUploadStep('processing')
                const regRes = await registerManualVideoBatch(selectedClassId, batchId, uploadedVideos)
                if (regRes.error) throw new Error(`영상 처리 등록 실패: ${regRes.error}`)
            }

            // 2. Handle Other Files (Direct Upload)
            for (let i = 0; i < otherFiles.length; i++) {
                const file = otherFiles[i]
                const formData = new FormData()
                formData.append('file', file)
                formData.append('path', `teacher_uploads/${selectedClassId}/${Date.now()}_${file.name}`)

                const uploadRes = await uploadImage(formData)

                if (uploadRes.success) {
                    uploadedMaterials.push({
                        class_id: selectedClassId,
                        type: file.type.startsWith('image/') ? 'teacher_blackboard_image' : 'material',
                        title: file.name,
                        content_url: uploadRes.url,
                        order_index: 0
                    })
                } else {
                    throw new Error(`파일 업로드 실패 (${file.name}): ${uploadRes.error}`)
                }

                // Update overall progress
                const overallBase = videoFiles.length / files.length;
                const otherProgress = (i + 1) / otherFiles.length * (otherFiles.length / files.length);
                setProgress(Math.round((overallBase + otherProgress) * 100));
            }

            if (uploadedMaterials.length > 0) {
                const materialRes = await createMaterials(uploadedMaterials)
                if (!materialRes.success) throw new Error(`자료 DB 등록 실패: ${materialRes.error}`);
            }

            setUploadStep('success')
            toast({
                title: '업로드 완료',
                description: `${files.length}개의 자료가 성공적으로 업로드되었습니다.${videoFiles.length > 0 ? ' 영상은 자동 편집 후 등록됩니다.' : ''}`,
            })

            setTimeout(() => {
                onSuccess()
                onOpenChange(false)
            }, 1500)

        } catch (err: any) {
            console.error('Upload failed:', err)
            setUploadStep('error')
            setErrorMessage(err.message || '업로드 중 오류가 발생했습니다.')
            toast({
                title: '업로드 실패',
                description: err.message || '오류가 발생했습니다.',
                variant: 'destructive',
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 gap-0"
                onInteractOutside={(e) => {
                    if (uploading) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UploadCloud className="h-6 w-6 text-primary" />
                        수업 자료 업로드
                    </DialogTitle>
                    <DialogDescription>
                        자료가 사용되었던 날짜와 수업을 선택하고 파일들을 업로드하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* 1. Date & Class Selection */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" /> 1. 날짜 선택
                            </Label>
                            <div className="border rounded-lg p-3 bg-white shadow-sm inline-block">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-md border-0"
                                    locale={ko}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" /> 2. 수업 선택
                            </Label>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {date ? format(date, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜를 선택하세요'}의 수업 목록:
                                </p>
                                {loadingClasses ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-md bg-slate-50">
                                        <Loader2 className="h-4 w-4 animate-spin" /> 수업 목록 불러오는 중...
                                    </div>
                                ) : classes.length > 0 ? (
                                    <Select
                                        value={selectedClassId}
                                        onValueChange={setSelectedClassId}
                                        disabled={uploading}
                                    >
                                        <SelectTrigger className="h-auto py-3">
                                            <SelectValue placeholder="수업을 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-semibold text-base">{cls.title}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                                총 수강생 {cls.studentCount}명
                                                            </span>
                                                            <span className="truncate max-w-[200px]">
                                                                {cls.students.slice(0, 3).join(', ')}{cls.students.length > 3 ? ' 등' : ''}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-muted-foreground p-4 border rounded-md bg-slate-50 text-center">
                                        해당 날짜에 수업이 없거나 날짜를 선택하지 않았습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. File Upload */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Upload className="h-4 w-4" /> 3. 파일 추가 (다중 선택 가능)
                        </Label>

                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/5'}
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <input {...getInputProps()} />
                            <div className="space-y-3">
                                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">여기를 클릭하거나 파일을 드래그하여 추가하세요</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, PPTX, 이미지, MP4지원 (여러 파일 선택 가능)</p>
                                </div>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2 mt-4 bg-muted/30 p-4 rounded-lg border border-border">
                                <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                                    <span>선택된 파일 ({files.length}개)</span>
                                    <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading} className="h-6 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                        모두 지우기
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 flex flex-col gap-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-background p-2 rounded border border-border shadow-sm text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-medium truncate max-w-[300px]">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeFile(idx)}
                                                disabled={uploading}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Feedback */}
                    {uploadStep === 'uploading' && (
                        <div className="space-y-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-primary font-medium flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> 파일 업로드 중...
                                </span>
                                <span className="text-primary font-bold">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-primary/20">
                                <div
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-primary/70 mt-1">대시보드를 벗어나지 마세요.</p>
                        </div>
                    )}

                    {uploadStep === 'processing' && (
                        <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-blue-700 font-medium flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> 영상 처리 요청 중...
                                </span>
                            </div>
                            <p className="text-xs text-blue-500 mt-1">대용량 영상 업로드 후 DB 등록을 마무리하고 있습니다.</p>
                        </div>
                    )}

                    {uploadStep === 'success' && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3 text-emerald-700 animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 className="h-6 w-6 shrink-0" />
                            <div>
                                <p className="font-semibold">업로드 완료!</p>
                                <p className="text-sm opacity-90">자료가 성공적으로 등록 되었습니다.</p>
                            </div>
                        </div>
                    )}

                    {uploadStep === 'error' && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">오류 발생</p>
                                <p className="text-sm mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/30 flex justify-end gap-2 rounded-b-lg">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={uploading}
                    >
                        닫기
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || !selectedClassId || uploading || uploadStep === 'success'}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow font-semibold px-6"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                처리 중...
                            </>
                        ) : (
                            `업로드 시작 (${files.length}개)`
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
