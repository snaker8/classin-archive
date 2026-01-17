'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Profile } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Upload, FolderInput, FileImage, Calendar, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { formatDate } from '@/lib/utils'

interface ParsedClass {
    id: string
    studentName: string
    studentId?: string
    date: string
    files: File[]
    status: 'pending' | 'uploading' | 'success' | 'error'
    message?: string
}

export default function BatchClassPage() {
    const router = useRouter()
    const [classes, setClasses] = useState<ParsedClass[]>([])
    const [loading, setLoading] = useState(false)
    const [students, setStudents] = useState<Profile[]>([])
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

    // Load students for matching
    useEffect(() => {
        const loadStudents = async () => {
            const { data } = await supabase.from('profiles').select('*').eq('role', 'student')
            if (data) setStudents(data)
        }
        loadStudents()
    }, [])

    // Smart Folder Parsing Logic
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newClassesMap = new Map<string, ParsedClass>()

        acceptedFiles.forEach(file => {
            // Expected path: StudentName/Date/File or StudentName/Date_Desc/File
            // webkitRelativePath example: "HongGilDong/2024-05-01/image.png"
            const pathParts = file.webkitRelativePath.split('/')

            // We need at least Student and Date folders (depth >= 3 including file)
            // Or maybe just Student/Date_File? 
            // Let's assume standard structure: Root/Student/Date/File
            // So pathParts[0] might be Root, pathParts[1] Student... 
            // Actually standard drag folder often gives "FolderName/Student/Date/File"

            // Let's search for the date-like part and assume the part BEFORE it is Student

            let dateIndex = -1
            // Regex for date roughly YYYY-MM-DD
            const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/

            for (let i = 0; i < pathParts.length; i++) {
                if (dateRegex.test(pathParts[i])) {
                    dateIndex = i
                    break
                }
            }

            if (dateIndex > 0) {
                const studentName = pathParts[dateIndex - 1] // Folder right before date
                const dateStr = pathParts[dateIndex].match(dateRegex)?.[0] || ''

                if (studentName && dateStr) {
                    const key = `${studentName}_${dateStr}`

                    if (!newClassesMap.has(key)) {
                        newClassesMap.set(key, {
                            id: key,
                            studentName,
                            date: dateStr,
                            files: [],
                            status: 'pending'
                        })
                    }

                    // Filter only images (or videos if we support them later as files)
                    if (file.type.startsWith('image/')) {
                        newClassesMap.get(key)!.files.push(file)
                    }
                }
            }
        })

        // Convert map to array and try to match student IDs
        const parsedList = Array.from(newClassesMap.values()).map(cls => {
            const matchedStudent = students.find(s =>
                s.full_name === cls.studentName || s.full_name.replace(/\s/g, '') === cls.studentName.replace(/\s/g, '')
            )
            return {
                ...cls,
                studentId: matchedStudent?.id
            }
        })

        setClasses(prev => [...prev, ...parsedList])
    }, [students])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: false,
        noKeyboard: true
    })

    // Start Bulk Upload
    const handleUpload = async () => {
        const pendingClasses = classes.filter(c => c.status === 'pending' && c.studentId && c.files.length > 0)
        if (pendingClasses.length === 0) return

        setLoading(true)
        setUploadProgress({ current: 0, total: pendingClasses.length })

        for (let i = 0; i < pendingClasses.length; i++) {
            const cls = pendingClasses[i]

            // Update status to uploading
            setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'uploading' } : c))

            try {
                const user = await supabase.auth.getUser()
                if (!user.data.user) throw new Error("Not authenticated")

                // 1. Create Class
                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .insert({
                        student_id: cls.studentId,
                        title: `${new Date(cls.date).toLocaleDateString('ko-KR')} 수업`,
                        class_date: cls.date,
                        created_by: user.data.user.id
                    })
                    .select()
                    .single()

                if (classError) throw classError

                // 2. Upload Images
                for (let j = 0; j < cls.files.length; j++) {
                    const file = cls.files[j]
                    const fileName = `${cls.studentId}/${cls.date}/${Date.now()}-${j}-${file.name}`

                    const { error: uploadError } = await supabase.storage
                        .from('blackboard-images')
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { data: urlData } = supabase.storage
                        .from('blackboard-images')
                        .getPublicUrl(fileName)

                    await supabase.from('materials').insert({
                        class_id: classData.id,
                        type: 'blackboard_image',
                        content_url: urlData.publicUrl,
                        order_index: j
                    })
                }

                // Success
                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'success' } : c))

            } catch (err: any) {
                console.error(err)
                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'error', message: err.message } : c))
            }

            setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }))
        }

        setLoading(false)
    }

    const removeClass = (id: string) => {
        setClasses(prev => prev.filter(c => c.id !== id))
    }

    const validClassesCount = classes.filter(c => c.studentId && c.files.length > 0 && c.status === 'pending').length

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        돌아가기
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold">자료 스마트 폴더 업로드</h2>
                        <p className="text-muted-foreground">
                            학생/날짜 폴더를 통째로 드래그하세요. 자동으로 분류합니다.
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {loading && (
                        <div className="text-sm text-muted-foreground mr-4">
                            진행률: {uploadProgress.current} / {uploadProgress.total}
                        </div>
                    )}
                    <Button
                        onClick={handleUpload}
                        disabled={loading || validClassesCount === 0}
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                업로드 중...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                {validClassesCount}개 수업 일괄 등록
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                    <strong>폴더 구조 안내:</strong>
                    <p className="mt-1">
                        <code>[아무폴더] / [학생이름] / [YYYY-MM-DD] / 이미지파일들...</code><br />
                        예: <code>내PC / 홍길동 / 2024-01-15 / 수학필기.jpg</code>
                    </p>
                </div>
            </div>

            {/* Drop Zone */}
            <Card className="border-2 border-dashed border-gray-300 shadow-none hover:border-primary transition-colors">
                <div {...getRootProps()} className="p-12 text-center cursor-pointer">
                    <input {...getInputProps()} />
                    <FolderInput className={`h-16 w-16 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-gray-300'}`} />
                    <h3 className="text-xl font-medium mb-2">
                        {isDragActive ? "여기에 폴더를 놓으세요!" : "여기에 학생 폴더들을 드래그하세요"}
                    </h3>
                    <p className="text-muted-foreground">
                        여러 학생 폴더를 한 번에 드래그해도 됩니다. (하위 폴더를 모두 검색합니다)
                    </p>
                </div>
            </Card>

            {/* Parsed Results */}
            {classes.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((cls) => (
                        <Card key={cls.id} className={`${cls.status === 'success' ? 'bg-green-50 border-green-200' :
                                cls.status === 'error' ? 'bg-red-50 border-red-200' :
                                    !cls.studentId ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                            }`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                    {/* Status Icon */}
                                    <div className="w-8 flex-shrink-0">
                                        {cls.status === 'pending' && <div className="w-3 h-3 rounded-full bg-gray-300 mx-auto" />}
                                        {cls.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />}
                                        {cls.status === 'success' && <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />}
                                        {cls.status === 'error' && <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-bold text-lg">{cls.studentName}</h4>
                                            {!cls.studentId && (
                                                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                                                    학생 못 찾음
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center mt-1 space-x-4">
                                            <span className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {formatDate(cls.date)}
                                            </span>
                                            <span className="flex items-center">
                                                <FileImage className="h-3 w-3 mr-1" />
                                                파일 {cls.files.length}개
                                                {cls.files.length === 0 && <span className="text-red-500 ml-1">(파일 없음)</span>}
                                            </span>
                                        </div>
                                        {cls.message && <div className="text-xs text-red-600 mt-1">{cls.message}</div>}
                                    </div>
                                </div>

                                {/* Actions */}
                                {cls.status === 'pending' && (
                                    <Button variant="ghost" size="sm" onClick={() => removeClass(cls.id)}>
                                        삭제
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
