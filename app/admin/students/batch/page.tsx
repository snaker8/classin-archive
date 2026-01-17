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
    status: 'pending' | 'success' | 'error'
    message?: string
}

export default function BatchStudentPage() {
    const router = useRouter()
    const [files, setFiles] = useState<FileItem[]>([])
    const [loading, setLoading] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => ({
            file,
            name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
            status: 'pending' as const
        }))
        setFiles(prev => [...prev, ...newFiles])
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv', '.xls', '.xlsx']
        }
    })

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleBatchRegister = async () => {
        if (files.length === 0) return

        setLoading(true)
        const newFiles = [...files]

        for (let i = 0; i < newFiles.length; i++) {
            if (newFiles[i].status === 'success') continue; // Skip already done

            const studentName = newFiles[i].name.trim()
            // Generate a unique-ish email handle
            // Helper to make random unique string
            const uniqueId = Math.random().toString(36).substring(2, 8)
            const email = `student_${Date.now()}_${uniqueId}@classin.com`
            const password = '123456' // User requested 1234, but min length is 6 usually.

            try {
                // 1. Create Auth User
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: studentName } },
                })

                if (authError) throw authError

                if (authData.user) {
                    newFiles[i].status = 'success'
                    newFiles[i].message = `가입 완료 (${email})`
                } else {
                    // Sometimes signUp returns null user if email confirm is on but we want to proceed.
                    // Actually for admin creation it might be different. 
                    // If 'auto confirm' is off, user is null? No, user is returned but session is null.
                    if (authData.user === null) throw new Error("User creation returned null")
                    newFiles[i].status = 'success'
                }

            } catch (error: any) {
                newFiles[i].status = 'error'
                newFiles[i].message = error.message
            }

            // Update state incrementally to show progress
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
                    <h2 className="text-3xl font-bold">학생 일괄 등록 (파일 기반)</h2>
                    <p className="text-muted-foreground">학생 이름으로 된 CSV 파일들을 드래그해서 등록하세요.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Drop Area */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>파일 업로드</CardTitle>
                        <CardDescription>
                            학생 이름.csv 파일들을 여기에 놓으세요.<br />
                            (예: <code>홍길동.csv</code>, <code>김철수.csv</code>)
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
                                {isDragActive ? "여기에 놓으세요!" : "파일을 여기에 드래그하세요"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                또는 클릭하여 파일 선택
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
                                총 {files.length}개 파일
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
                                <p>등록할 파일이 없습니다</p>
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
                                                <p className="font-medium truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {item.status === 'success' ? item.message : item.file.name}
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
