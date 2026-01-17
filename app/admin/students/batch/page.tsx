'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Upload, FileText, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface FileItem {
    file: File
    name: string
    grade?: string // Class/Grade info
    status: 'pending' | 'success' | 'error'
    message?: string
}

export default function BatchStudentPage() {
    const router = useRouter()
    const [files, setFiles] = useState<FileItem[]>([])
    const [loading, setLoading] = useState(false)

    // Utility to traverse directories (Recursive)
    async function getFilesFromEvent(event: any) {
        const items = event.dataTransfer ? event.dataTransfer.items : event.target.files
        const files: File[] = []

        // Normalize to array
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
            // Fallback for non-drag input
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
        const potentialStudents = new Map<string, FileItem>()

        acceptedFiles.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/')
            let extractedName = ''
            let extractedGrade = ''

            // Logic to find Student Name and Class Name (Grade)

            // 1. Try Filename first (most specific)
            const filename = pathParts[pathParts.length - 1]
            const nameFromFilename = filename.split(/[_.\s-]/)[0]

            if (nameFromFilename && nameFromFilename.length > 1 && !nameFromFilename.match(/^\d+$/)) {
                extractedName = nameFromFilename
                // Grade is the immediate parent folder
                if (pathParts.length > 1) {
                    extractedGrade = pathParts[pathParts.length - 2]
                }
            }
            // 2. If filename didn't yield a name (or it was just numbers/generic), try Folder Name
            else if (pathParts.length > 1) {
                // Assume the folder naming the file is the Student
                const folderName = pathParts[pathParts.length - 2]
                extractedName = folderName
                // Grade is the parent of that folder (Grandparent of file)
                if (pathParts.length > 2) {
                    extractedGrade = pathParts[pathParts.length - 3]
                }
            }

            if (extractedName && extractedName.length > 1) {
                if (!potentialStudents.has(extractedName)) {
                    potentialStudents.set(extractedName, {
                        file,
                        name: extractedName,
                        grade: extractedGrade,
                        status: 'pending'
                    })
                }
            }
        })

        setFiles(prev => {
            // Deduplicate against existing list
            const newItems = Array.from(potentialStudents.values()).filter(
                newItem => !prev.some(existing => existing.name === newItem.name)
            )
            return [...prev, ...newItems]
        })
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        getFilesFromEvent: (event) => getFilesFromEvent(event).then(f => f),
        // Accept anything since we just want names
    })

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    // Helper for delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const handleBatchRegister = async () => {
        if (files.length === 0) return

        setLoading(true)
        const newFiles = [...files]

        for (let i = 0; i < newFiles.length; i++) {
            if (newFiles[i].status === 'success') continue;

            // Add delay to prevent Supabase Rate Limit (auth.signUp is often rate limited)
            if (i > 0) await delay(1000) // 1 second delay between requests

            const studentName = newFiles[i].name.trim()
            const uniqueId = Math.random().toString(36).substring(2, 8)
            const email = `student_${Date.now()}_${uniqueId}@classin.com`
            const password = '123456'

            try {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: studentName,
                            grade: newFiles[i].grade
                        }
                    },
                })

                if (authError) throw authError

                if (authData.user) {
                    newFiles[i].status = 'success'
                    newFiles[i].message = `가입 완료 (${newFiles[i].grade ? newFiles[i].grade : '반 정보 없음'})`
                } else {
                    if (authData.user === null) throw new Error("User creation returned null")
                    newFiles[i].status = 'success'
                }

            } catch (error: any) {
                console.error(error)
                newFiles[i].status = 'error'
                newFiles[i].message = error.message

                // If rate limited, wait longer and try one more time?
                // Or just let it fail and user can retry pending.
                // Let's just pause a bit more if error happens
                await delay(2000)
            }

            setFiles([...newFiles])
        }

        setLoading(false)
    }

    const pendingCount = files.filter(f => f.status === 'pending').length
    const successCount = files.filter(f => f.status === 'success').length

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    돌아가기
                </Button>
                <div>
                    <h2 className="text-3xl font-bold">학생 일괄 등록 (파일/폴더 기반)</h2>
                    <p className="text-muted-foreground">이름이 있는 파일이나 학생 폴더를 드래그하세요. 반(폴더) 정보도 자동 인식합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Drop Area */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>파일/폴더 업로드</CardTitle>
                        <CardDescription>
                            <code>[반이름] / [학생이름]</code> 구조의 폴더를 통째로 드래그하세요.<br />
                            (예: <code>중3A반/홍길동/..</code> → 홍길동(중3A반) 등록)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div
                            {...getRootProps()}
                            className={`flex-1 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[300px] ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <Upload className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
                            <p className="text-lg font-medium text-center mb-2">
                                {isDragActive ? "여기에 놓으세요!" : "폴더를 통째로 여기에 드래그하세요"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                하위 폴더까지 모두 검색하여 학생 이름을 찾습니다
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* List Area */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>등록 대기 목록</CardTitle>
                            <CardDescription>
                                총 {files.length}명 감지됨
                            </CardDescription>
                        </div>
                        {pendingCount > 0 && (
                            <Button onClick={handleBatchRegister} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {pendingCount}명 일괄 가입 실행
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
                        {files.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10 opacity-50">
                                <FileText className="h-12 w-12 mx-auto mb-3" />
                                <p>등록할 학생이 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {files.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-md border ${item.status === 'success' ? 'bg-green-50 border-green-200' :
                                            item.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            {item.status === 'success' ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                            ) : item.status === 'error' ? (
                                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                            ) : (
                                                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-bold truncate">{item.name}</p>
                                                    {item.grade && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                                            {item.grade}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {item.status === 'success' ? item.message : (item.grade ? `${item.grade} 폴더에서 발견` : item.file.name)}
                                                </p>
                                                {item.status === 'error' && (
                                                    <p className="text-xs text-red-600 truncate">{item.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        {item.status === 'pending' && !loading && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => removeFile(idx)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
