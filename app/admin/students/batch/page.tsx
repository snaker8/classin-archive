'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Upload, FileText, X, Table } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'

interface FileItem {
    file: File
    name: string
    phone?: string
    grade?: string // Class/Grade info
    center?: string
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

    // 엑셀 파일 파싱
    const parseExcelFile = useCallback(async (file: File): Promise<FileItem[]> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const sheet = workbook.Sheets[workbook.SheetNames[0]]
                    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

                    if (rows.length === 0) { resolve([]); return }

                    // 컬럼 자동 감지: 이름, 전화번호, 센터, 반
                    const headers = Object.keys(rows[0])
                    const findCol = (keywords: string[]) =>
                        headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || ''

                    const nameCol = findCol(['이름', '성명', 'name', '학생'])
                    const phoneCol = findCol(['전화', '번호', 'phone', '연락처', '핸드폰', '휴대폰'])
                    const centerCol = findCol(['센터', 'center', '지점'])
                    const gradeCol = findCol(['반', 'class', 'grade', '학년', '그룹', 'group'])

                    if (!nameCol) {
                        // 첫 번째 컬럼을 이름으로 사용
                        const firstCol = headers[0]
                        const items: FileItem[] = rows
                            .map(row => {
                                const name = String(row[firstCol] || '').trim()
                                if (!name || !/^[가-힣]{2,4}$/.test(name)) return null
                                return {
                                    file,
                                    name,
                                    phone: phoneCol ? String(row[phoneCol] || '').replace(/-/g, '').trim() : undefined,
                                    center: centerCol ? String(row[centerCol] || '').trim() : undefined,
                                    grade: gradeCol ? String(row[gradeCol] || '').trim() : undefined,
                                    status: 'pending' as const,
                                }
                            })
                            .filter(Boolean) as FileItem[]
                        resolve(items)
                        return
                    }

                    const items: FileItem[] = rows
                        .map(row => {
                            const name = String(row[nameCol] || '').trim()
                            if (!name || !/^[가-힣]{2,4}$/.test(name)) return null
                            return {
                                file,
                                name,
                                phone: phoneCol ? String(row[phoneCol] || '').replace(/-/g, '').trim() : undefined,
                                center: centerCol ? String(row[centerCol] || '').trim() : undefined,
                                grade: gradeCol ? String(row[gradeCol] || '').trim() : undefined,
                                status: 'pending' as const,
                            }
                        })
                        .filter(Boolean) as FileItem[]

                    resolve(items)
                } catch (err) {
                    console.error('Excel parse error:', err)
                    resolve([])
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }, [])

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const potentialStudents = new Map<string, FileItem>()

        // 1. 엑셀 파일 처리
        const excelFiles = acceptedFiles.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
        )
        for (const excelFile of excelFiles) {
            const items = await parseExcelFile(excelFile)
            items.forEach(item => {
                if (!potentialStudents.has(item.name)) {
                    potentialStudents.set(item.name, item)
                }
            })
        }

        // 2. 폴더/파일 구조에서 이름 추출 (기존 로직)
        const nonExcelFiles = acceptedFiles.filter(f =>
            !f.name.endsWith('.xlsx') && !f.name.endsWith('.xls') && !f.name.endsWith('.csv')
        )
        nonExcelFiles.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/')
            let extractedName = ''
            let extractedGrade = ''

            const filename = pathParts[pathParts.length - 1]
            const nameFromFilename = filename.split(/[_.\s-]/)[0]

            if (nameFromFilename && nameFromFilename.length > 1 && !nameFromFilename.match(/^\d+$/)) {
                extractedName = nameFromFilename
                if (pathParts.length > 1) {
                    extractedGrade = pathParts[pathParts.length - 2]
                }
            } else if (pathParts.length > 1) {
                const folderName = pathParts[pathParts.length - 2]
                extractedName = folderName
                if (pathParts.length > 2) {
                    extractedGrade = pathParts[pathParts.length - 3]
                }
            }

            const isValidKoreanName = extractedName && /^[가-힣]{2,4}$/.test(extractedName)
            const isFileMaterial = /판서|교재|바이블|유형|개념|차시|정답|해설|시험|모의고사/.test(filename)

            if (isValidKoreanName && !isFileMaterial) {
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
            const newItems = Array.from(potentialStudents.values()).filter(
                newItem => !prev.some(existing => existing.name === newItem.name)
            )
            return [...prev, ...newItems]
        })
    }, [parseExcelFile])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        getFilesFromEvent: (event) => getFilesFromEvent(event).then(f => f),
        // Accept excel files and any other files (for folder-based detection)
    })

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleBatchRegister = async () => {
        if (files.length === 0) return

        setLoading(true)
        const newFiles = [...files]

        try {
            // 서버 API로 일괄 등록 (Admin API 사용 - 세션 영향 없음)
            const { data: { session } } = await supabase.auth.getSession()
            const pendingStudents = newFiles
                .filter(f => f.status === 'pending')
                .map(f => ({
                    name: f.name.trim(),
                    phone: f.phone?.replace(/-/g, ''),
                    center: f.center,
                    grade: f.grade,
                }))

            const response = await fetch('/api/admin/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ students: pendingStudents }),
            })

            const { results, error } = await response.json()

            if (error) {
                alert(`오류: ${error}`)
                setLoading(false)
                return
            }

            // 결과를 파일 목록에 반영
            const resultMap = new Map<string, { name: string; status: 'success' | 'error'; message: string }>(results.map((r: any) => [r.name, r]))
            for (let i = 0; i < newFiles.length; i++) {
                const result = resultMap.get(newFiles[i].name.trim())
                if (result) {
                    newFiles[i].status = result.status
                    newFiles[i].message = result.message
                }
            }
            setFiles([...newFiles])
        } catch (error: any) {
            console.error('Batch register error:', error)
            alert(`일괄 등록 중 오류 발생: ${error.message}`)
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
                            <strong>엑셀 파일</strong>(.xlsx/.xls/.csv)을 드래그하거나,<br />
                            <code>[반이름] / [학생이름]</code> 구조의 폴더를 통째로 드래그하세요.<br />
                            <span className="text-xs text-muted-foreground mt-1 block">
                                엑셀 컬럼: 이름(필수), 전화번호, 센터, 반 — 자동 인식
                            </span>
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
                                {isDragActive ? "여기에 놓으세요!" : "엑셀 파일 또는 폴더를 드래그하세요"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                .xlsx, .xls, .csv 파일 또는 학생 폴더를 지원합니다
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
                                            item.status === 'error' && item.message?.includes('이미 등록') ? 'bg-yellow-50 border-yellow-200' :
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
                                                    {item.status === 'success' ? item.message : [item.phone, item.center, item.grade].filter(Boolean).join(' · ') || item.file.name}
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
