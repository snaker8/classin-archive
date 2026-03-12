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
import { Upload, Loader2, Video, CheckCircle2, AlertCircle, X, FileVideo, Calendar as CalendarIcon } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { getAllClasses } from '@/app/actions/class'
import { registerManualVideoBatch } from '@/app/actions/video-archive'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface VideoUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB per chunk

export function VideoUploadDialog({ open, onOpenChange, onSuccess }: VideoUploadDialogProps) {
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
            setFiles([])
            setSelectedClassId('')
            setUploadStep('idle')
            setProgress(0)
            setErrorMessage('')
        }
    }, [open, date])

    async function loadClasses(selectedDate: Date) {
        setLoadingClasses(true)
        setSelectedClassId('')
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const res = await getAllClasses({ limit: 500, date: dateStr })
            if (res.classes) {
                const groups = res.classes.reduce((acc: any, cls: any) => {
                    if (!acc[cls.title]) {
                        acc[cls.title] = {
                            id: cls.id,
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

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.mkv']
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
            const batchId = crypto.randomUUID()
            const uploadedFiles: { path: string, name: string }[] = []
            const totalSize = files.reduce((acc, f) => acc + f.size, 0)
            let totalUploaded = 0

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

                for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                    const start = chunkIdx * CHUNK_SIZE
                    const end = Math.min(start + CHUNK_SIZE, file.size)
                    const chunk = file.slice(start, end)

                    const formData = new FormData()
                    formData.append('chunk', chunk)
                    formData.append('chunkIndex', String(chunkIdx))
                    formData.append('totalChunks', String(totalChunks))
                    formData.append('chunkSize', String(CHUNK_SIZE))
                    formData.append('filename', file.name)
                    formData.append('batchId', batchId)
                    formData.append('classId', selectedClassId)
                    formData.append('localOnly', 'true')

                    const res = await fetch('/api/upload/chunk', {
                        method: 'POST',
                        body: formData,
                    })

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}))
                        throw new Error(`파일 업로드 실패 (${file.name}): ${errData.error || res.statusText}`)
                    }

                    const result = await res.json()
                    totalUploaded += (end - start)
                    setProgress(Math.round((totalUploaded / totalSize) * 100))

                    if (result.isComplete && result.localPath) {
                        uploadedFiles.push({ path: result.localPath, name: file.name })
                    }
                }
            }

            setUploadStep('processing')

            // 3. Register batch in DB
            const regRes = await registerManualVideoBatch(selectedClassId, batchId, uploadedFiles)
            if (regRes.error) throw new Error(regRes.error)

            setUploadStep('success')
            toast({
                title: '업로드 완료',
                description: `${files.length}개의 동영상이 업로드되었습니다. 자동 편집이 시작됩니다.`,
            })

            setTimeout(() => {
                onSuccess()
                onOpenChange(false)
            }, 2000)

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
                        <Video className="h-6 w-6 text-indigo-600" />
                        복습 영상 수동 업로드 (일괄 편집)
                    </DialogTitle>
                    <DialogDescription>
                        날짜와 수업을 선택하고, 여러 개의 동영상을 업로드하면 자동으로 하나의 영상으로 편집됩니다.
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
                                <Video className="h-4 w-4" /> 2. 수업 선택
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
                            <Upload className="h-4 w-4" /> 3. 동영상 파일 추가 (다중 선택 가능)
                        </Label>

                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                ${isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'}
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <input {...getInputProps()} />
                            <div className="space-y-3">
                                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">여기를 클릭하거나 파일을 드래그하여 추가하세요</p>
                                    <p className="text-xs text-slate-500 mt-1">MP4, MOV, AVI (여러 파일 선택 가능)</p>
                                </div>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2 mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                                    <span>선택된 파일 ({files.length}개)</span>
                                    <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading} className="h-6 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                        모두 지우기
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <FileVideo className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-medium truncate max-w-[300px]">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-rose-500"
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
                        <div className="space-y-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-indigo-700 font-medium flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> 서버로 업로드 중... (5MB 단위 청크 전송)
                                </span>
                                <span className="text-indigo-600 font-bold">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-indigo-100">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-indigo-500 mt-1">대용량 파일은 시간이 걸릴 수 있습니다. 창을 닫지 마세요.</p>
                        </div>
                    )}

                    {uploadStep === 'success' && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3 text-emerald-700 animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 className="h-6 w-6 shrink-0" />
                            <div>
                                <p className="font-semibold">업로드 및 접수 완료!</p>
                                <p className="text-sm opacity-90">잠시 후 AI가 자동으로 영상을 편집하고 처리합니다.</p>
                            </div>
                        </div>
                    )}

                    {uploadStep === 'error' && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3 text-rose-700 animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">오류 발생</p>
                                <p className="text-sm mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-lg">
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow font-semibold px-6"
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
