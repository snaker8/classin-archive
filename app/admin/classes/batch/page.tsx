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
    isTeacherBoard?: boolean
}

export default function BatchClassPage() {
    const router = useRouter()
    const [classes, setClasses] = useState<ParsedClass[]>([])
    const [loading, setLoading] = useState(false)
    const [students, setStudents] = useState<Profile[]>([])
    const [teachers, setTeachers] = useState<{ id: string, name: string }[]>([])
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
    const [rejectedFiles, setRejectedFiles] = useState<{ path: string; reason: string }[]>([])

    // Load students and teachers
    useEffect(() => {
        const loadData = async () => {
            const { data: studentData } = await supabase.from('profiles').select('*').eq('role', 'student')
            if (studentData) setStudents(studentData)

            const { getTeachers } = await import('@/app/actions/teacher')
            const { teachers: teacherData } = await getTeachers()
            if (teacherData) setTeachers(teacherData)
        }
        loadData()
    }, [])

    // Smart Folder Parsing Logic
    async function getFilesFromEvent(event: any) {
        // ... (Keep existing recursion logic)
        const items = event.dataTransfer ? event.dataTransfer.items : event.target.files
        const files: File[] = []

        const itemSearchParams = []
        if (event.dataTransfer) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
                if (entry) {
                    itemSearchParams.push(traverseFileTree(entry))
                }
            }
        } else {
            for (let i = 0; i < items.length; i++) {
                files.push(items[i])
            }
            return files
        }

        await Promise.all(itemSearchParams)

        async function traverseFileTree(item: any, path = '') {
            if (item.isFile) {
                return new Promise<void>((resolve) => {
                    item.file((file: any) => {
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: path + file.name
                        });
                        files.push(file)
                        resolve()
                    })
                })
            } else if (item.isDirectory) {
                const dirReader = item.createReader()
                let entries: any[] = []

                const readEntries = async () => {
                    const result = await new Promise<any[]>((resolve, reject) => {
                        dirReader.readEntries(resolve, reject)
                    })

                    if (result.length > 0) {
                        entries = entries.concat(result)
                        await readEntries()
                    }
                }

                await readEntries()
                const promises = entries.map((entry) => traverseFileTree(entry, path + item.name + "/"))
                await Promise.all(promises)
            }
        }

        return files
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newClassesMap = new Map<string, ParsedClass>()
        const newRejected: { path: string; reason: string }[] = []

        const studentMap = new Map<string, Profile>()
        students.forEach(s => {
            if (s.full_name) {
                studentMap.set(s.full_name, s)
                studentMap.set(s.full_name.replace(/\s/g, ''), s)
            }
        })

        acceptedFiles.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/')
            const filename = pathParts[pathParts.length - 1]

            // 0. Check for Teacher Board (Higher Priority)
            const matchedTeacher = teachers.find(t => filename.includes(t.name))

            if (matchedTeacher) {
                // Teacher Board Detection
                // We use the date from the folder structure if possible
                let date = new Date().toISOString().split('T')[0]

                // Try to find a date in the path
                // Simple regex for 2024-01-01 or 2024.01.01 or 240101? 
                // Let's stick to the existing logic: usually date is parent folder?
                // Or if it matches a student folder structure, use that date.
                // For simplicity, let's look for a date-like folder name.
                // Or just default to today if not granularly detectable.

                // Reuse logic A/B from below to determine "Context" (Date)
                const parentIndex = pathParts.length - 2
                let folderDate = ''
                // Very basic date parsing from folder names if possible, else today

                const key = `TEACHER_${matchedTeacher.id}_${file.webkitRelativePath}` // Unique per file to allow multiple teacher uploads

                // We treat each teacher file as a "Task" to distribute
                if (!newClassesMap.has(key)) {
                    newClassesMap.set(key, {
                        id: key,
                        studentName: `${matchedTeacher.name} 선생님 (일괄 배포)`,
                        studentId: matchedTeacher.id, // Use teacher ID as placeholder
                        date: date,
                        files: [],
                        status: 'pending',
                        message: '선생님 판서 (해당 날짜 모든 수업에 배포)',
                        isTeacherBoard: true
                    })
                }
                newClassesMap.get(key)!.files.push(file)
                return // Skip student matching
            }

            // Normal Student Matching ...
            let matchedStudent: Profile | undefined
            let studentIndex = -1

            // 1. Search for Student Name in path parts
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i]
                if (studentMap.has(part) || studentMap.has(part.replace(/\s/g, ''))) {
                    matchedStudent = studentMap.get(part) || studentMap.get(part.replace(/\s/g, ''))
                    studentIndex = i
                    break
                }
            }

            // 2. If not found in folders, check Filename
            if (!matchedStudent) {
                const possibleNames = filename.split(/[_.\s-]/)
                const firstNamePart = possibleNames[0]

                if (studentMap.has(firstNamePart)) {
                    matchedStudent = studentMap.get(firstNamePart)
                    studentIndex = pathParts.length - 1
                }
            }

            if (matchedStudent && studentIndex !== -1) {
                let classTitle = ''
                if (studentIndex < pathParts.length - 1) {
                    if (studentIndex + 1 < pathParts.length - 1) {
                        classTitle = pathParts[studentIndex + 1]
                    } else {
                        classTitle = `${new Date().toLocaleDateString('ko-KR')} 업로드`
                    }
                } else {
                    const parentIndex = pathParts.length - 2
                    if (parentIndex >= 0) {
                        classTitle = pathParts[parentIndex]
                    } else {
                        classTitle = `${new Date().toLocaleDateString('ko-KR')} 업로드`
                    }
                }

                const key = `${matchedStudent.id}_${classTitle}`

                if (!newClassesMap.has(key)) {
                    newClassesMap.set(key, {
                        id: key,
                        studentName: matchedStudent.full_name,
                        studentId: matchedStudent.id,
                        date: new Date().toISOString().split('T')[0],
                        files: [],
                        status: 'pending',
                        message: classTitle
                    })
                }
                newClassesMap.get(key)!.files.push(file)
            } else {
                newRejected.push({ path: file.webkitRelativePath, reason: `No matching student or teacher found` })
            }
        })

        const parsedList = Array.from(newClassesMap.values())
        setClasses(prev => [...prev, ...parsedList])
        setRejectedFiles(prev => [...prev, ...newRejected])
    }, [students, teachers])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        getFilesFromEvent: (event) => getFilesFromEvent(event).then(f => f),
        noClick: false,
        noKeyboard: true
    })

    const handleUpload = async () => {
        const pendingClasses = classes.filter(c => c.status === 'pending' && c.files.length > 0)
        if (pendingClasses.length === 0) return

        setLoading(true)
        setUploadProgress({ current: 0, total: pendingClasses.length })

        // 1. Separate Teacher Boards and Student Classes
        const studentClasses = pendingClasses.filter(c => !c.isTeacherBoard)
        const teacherBoards = pendingClasses.filter(c => c.isTeacherBoard)

        // 2. Upload Student Classes First (to ensure classes exist)
        for (const cls of studentClasses) {
            await processClass(cls)
        }

        // 3. Upload and Distribute Teacher Boards
        for (const board of teacherBoards) {
            await processTeacherBoard(board)
        }

        async function processClass(cls: ParsedClass) {
            setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'uploading' } : c))
            try {
                const user = await supabase.auth.getUser()
                if (!user.data.user) throw new Error("Not authenticated")

                const title = cls.message && cls.message !== ''
                    ? cls.message
                    : `${new Date(cls.date).toLocaleDateString('ko-KR')} 수업`

                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .insert({
                        student_id: cls.studentId,
                        title: title,
                        class_date: cls.date,
                        created_by: user.data.user.id
                    })
                    .select()
                    .single()

                if (classError) throw classError

                for (let j = 0; j < cls.files.length; j++) {
                    const file = cls.files[j]
                    const fileName = `${cls.studentId}/${cls.date}/${Date.now()}-${j}-${file.name}`
                    const { error: uploadError } = await supabase.storage.from('blackboard-images').upload(fileName, file)
                    if (uploadError) throw uploadError

                    const { data: urlData } = supabase.storage.from('blackboard-images').getPublicUrl(fileName)

                    await supabase.from('materials').insert({
                        class_id: classData.id,
                        type: 'blackboard_image',
                        content_url: urlData.publicUrl,
                        order_index: j
                    })
                }
                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'success' } : c))
            } catch (err: any) {
                console.error(err)
                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'error', message: err.message } : c))
            }
            setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }))
        }

        async function processTeacherBoard(item: ParsedClass) {
            setClasses(prev => prev.map(c => c.id === item.id ? { ...c, status: 'uploading' } : c))
            try {
                // Upload File Once
                const file = item.files[0] // Assume 1 file per teacher board entry for now, or loop
                const extension = file.name.split('.').pop() || 'png'
                const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")
                const fileName = `teacher-uploads/${item.date}/${Date.now()}-${baseName}.${extension}`

                const { error: uploadError } = await supabase.storage.from('blackboard-images').upload(fileName, file)
                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage.from('blackboard-images').getPublicUrl(fileName)
                const publicUrl = urlData.publicUrl

                // Distribute to ALL classes on that date
                // We can use a direct DB query here since we are client-side admin (or effectively valid user) called supabase
                // But better to use the server action for safety/consistency?
                // Wait, we are in 'use client' component, so we can't use server action directly if it uses cookies? 
                // Actually server actions are fine.

                // However, we want to include the classes we JUST created in `studentClasses` loop.
                // The server action queries the DB.
                // Since we awaited `processClass`, the DB should be up to date.

                // Let's manually do it to avoid import issues or just call logic.
                // We will query classes on date.

                const { data: classesOnDate, error: classQueryError } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('class_date', item.date)

                if (classQueryError) throw classQueryError

                if (classesOnDate && classesOnDate.length > 0) {
                    const materials = classesOnDate.map(c => ({
                        class_id: c.id,
                        type: 'teacher_blackboard_image',
                        content_url: publicUrl,
                        order_index: 0
                    }))

                    const { error: insertError } = await supabase.from('materials').insert(materials)
                    if (insertError) throw insertError
                }

                setClasses(prev => prev.map(c => c.id === item.id ? { ...c, status: 'success', message: `${classesOnDate?.length || 0}개 수업 배포 완료` } : c))

            } catch (err: any) {
                console.error(err)
                setClasses(prev => prev.map(c => c.id === item.id ? { ...c, status: 'error', message: err.message } : c))
            }
            setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }))
        }

        setLoading(false)
    }

    const removeClass = (id: string) => {
        setClasses(prev => prev.filter(c => c.id !== id))
    }

    const validClassesCount = classes.filter(c => c.status === 'pending').length
    // ... (rest is render)

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
                                {validClassesCount}개 항목 일괄 등록
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                    <strong>폴더 구조 안내:</strong>
                    <p className="mt-1">
                        <code>[아무폴더] / [학생이름] / [수업명(선택)] / 이미지파일들...</code><br />
                        <strong>선생님 판서 자동 배포:</strong> 파일명에 선생님 이름이 포함되면 해당 날짜의 모든 수업에 자동 배포됩니다.<br />
                        예: <code>김선생_수학필기.jpg</code> → 오늘 날짜 모든 수업에 배포
                    </p>
                </div>
            </div>

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

            {rejectedFiles.length > 0 && (
                <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono max-h-40 overflow-y-auto">
                    <h4 className="font-bold text-gray-700 mb-2">무시된 파일들 ({rejectedFiles.length}개) - 디버깅용</h4>
                    {rejectedFiles.map((f, i) => (
                        <div key={i} className="flex justify-between border-b border-gray-200 py-1">
                            <span className="truncate w-2/3" title={f.path}>{f.path}</span>
                            <span className="text-red-500 w-1/3 text-right">{f.reason}</span>
                        </div>
                    ))}
                    <Button variant="link" size="sm" onClick={() => setRejectedFiles([])} className="mt-2 h-auto p-0 text-gray-500">
                        목록 지우기
                    </Button>
                </div>
            )}

            {classes.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((cls) => (
                        <Card key={cls.id} className={`${cls.status === 'success' ? 'bg-green-50 border-green-200' :
                            cls.status === 'error' ? 'bg-red-50 border-red-200' :
                                cls.isTeacherBoard ? 'bg-purple-50 border-purple-200' : // Purple for teacher
                                    !cls.studentId ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                            }`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                    <div className="w-8 flex-shrink-0">
                                        {cls.status === 'pending' && <div className="w-3 h-3 rounded-full bg-gray-300 mx-auto" />}
                                        {cls.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />}
                                        {cls.status === 'success' && <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />}
                                        {cls.status === 'error' && <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />}
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-bold text-lg">
                                                {cls.studentName}
                                                {cls.isTeacherBoard && <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded">일괄 배포</span>}
                                            </h4>
                                            {!cls.studentId && !cls.isTeacherBoard && (
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
                                            </span>
                                        </div>
                                        {cls.message && <div className={`text-xs mt-1 ${cls.status === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>{cls.message}</div>}
                                    </div>
                                </div>

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
