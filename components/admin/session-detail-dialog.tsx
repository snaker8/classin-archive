'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSessionDetails, addMaterialToSession, deleteMaterialFromSession } from '@/app/actions/group'
import { FileText, Video, Link as LinkIcon, ExternalLink, Trash2, Plus, Loader2, Zap, FolderOpen, Download, Image as ImageIcon, User, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

interface SessionDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: {
        class_ids: string[]
        title: string
        class_date?: string
    } | null
    onUpdate?: () => void
}

export function SessionDetailDialog({ open, onOpenChange, session, onUpdate }: SessionDetailDialogProps) {
    const [materials, setMaterials] = useState<any[]>([])
    const [teacherMaterials, setTeacherMaterials] = useState<any[]>([])
    const [studentMaterials, setStudentMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())

    // Add Material State
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [type, setType] = useState('link')
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open && session) {
            loadMaterials()
            setExpandedStudents(new Set())
        }
    }, [open, session])

    async function loadMaterials() {
        if (!session) return
        setLoading(true)
        try {
            const res = await getSessionDetails(session.class_ids)
            setMaterials(res.materials || [])
            setTeacherMaterials(res.teacherMaterials || [])
            setStudentMaterials(res.studentMaterials || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!title) { alert('제목을 입력해주세요.'); return }
        if (type === 'ai_video') { setIsAddOpen(false); return }
        if (!url) { alert('링크를 입력해주세요.'); return }
        if (!session) return

        setIsSubmitting(true)
        try {
            const res = await addMaterialToSession(session.class_ids, { type, title, url })
            if (!res.success) throw new Error(res.error)
            await loadMaterials()
            setIsAddOpen(false)
            setTitle('')
            setUrl('')
            if (onUpdate) onUpdate()
        } catch (e: any) {
            alert(e.message || '실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(material: any) {
        if (!confirm(`'${material.title}' 자료를 삭제하시겠습니까?`)) return
        if (!session) return
        try {
            const res = await deleteMaterialFromSession(session.class_ids, { title: material.title, type: material.type })
            if (res.success) { await loadMaterials(); if (onUpdate) onUpdate() }
            else alert(res.error)
        } catch (e) { console.error(e) }
    }

    async function handleDownload(contentUrl: string, fileName: string) {
        try {
            const res = await fetch(contentUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = fileName || 'download.png'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        } catch (e: any) {
            console.error('Download failed:', e)
            toast({ title: '다운로드 실패', description: e.message || String(e), variant: 'destructive' })
        }
    }

    async function handleCopyImage(contentUrl: string) {
        try {
            const res = await fetch(contentUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            let blob = await res.blob()
            // Clipboard API는 image/png만 안정적으로 지원 — 다른 포맷이면 canvas 경유로 PNG 변환
            if (!blob.type.startsWith('image/png')) {
                const tempUrl = URL.createObjectURL(blob)
                try {
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve()
                        img.onerror = () => reject(new Error('이미지 로드 실패'))
                        img.src = tempUrl
                    })
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth
                    canvas.height = img.naturalHeight
                    const ctx = canvas.getContext('2d')
                    if (!ctx) throw new Error('Canvas 미지원')
                    ctx.drawImage(img, 0, 0)
                    blob = await new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 변환 실패')), 'image/png')
                    })
                } finally {
                    URL.revokeObjectURL(tempUrl)
                }
            }
            const item = new ClipboardItem({ [blob.type]: blob })
            await navigator.clipboard.write([item])
            toast({
                title: '복사 완료',
                description: '클립보드에 이미지가 복사됐습니다. 리포트 생성기에서 Ctrl+V로 붙여넣으세요.'
            })
        } catch (e: any) {
            console.error('Copy failed:', e)
            toast({
                title: '복사 실패',
                description: e?.message || '브라우저에서 이미지 복사 미지원. 다운로드 후 사용하세요.',
                variant: 'destructive'
            })
        }
    }

    function toggleStudent(studentId: string) {
        const next = new Set(expandedStudents)
        if (next.has(studentId)) next.delete(studentId)
        else next.add(studentId)
        setExpandedStudents(next)
    }

    function expandAll() {
        setExpandedStudents(new Set(studentMaterials.map(s => s.studentId)))
    }

    const getFolderName = () => {
        if (!session) return ''
        const datePart = session.class_date ? session.class_date.split('T')[0] : 'YYYY-MM-DD'
        const safeTitle = session.title.replace(/[\\/:*?"<>|]/g, '_')
        return `${datePart} ${safeTitle}`
    }

    if (!session) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{session.title} - 수업 자료</DialogTitle>
                    {session.class_date && (
                        <p className="text-sm text-muted-foreground">{session.class_date}</p>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            자료 로딩 중...
                        </div>
                    ) : (teacherMaterials.length === 0 && studentMaterials.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <FileText className="h-8 w-8 opacity-20" />
                            등록된 자료가 없습니다.
                        </div>
                    ) : (
                        <>
                            {/* 선생님 판서 */}
                            {teacherMaterials.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                        <div className="p-1 rounded bg-emerald-50"><FileText className="h-3.5 w-3.5 text-emerald-600" /></div>
                                        선생님 판서 / 공통 자료
                                        <span className="text-xs text-muted-foreground font-normal">({teacherMaterials.length})</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {teacherMaterials.map((m, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/30">
                                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                    <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                                                        {m.type === 'video_link' ? <Video className="h-4 w-4 text-emerald-700" /> : <ImageIcon className="h-4 w-4 text-emerald-700" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-sm truncate">{m.title || '선생님 판서'}</div>
                                                        <div className="text-[10px] text-muted-foreground">{m.type === 'video_link' ? '영상' : '선생님 판서'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {m.content_url && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="새 탭에서 열기" onClick={() => window.open(m.content_url, '_blank')}>
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="다운로드" onClick={() => handleDownload(m.content_url, m.title || 'teacher_board.png')}>
                                                                <Download className="h-3.5 w-3.5" />
                                                            </Button>
                                                            {m.type !== 'video_link' && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="이미지 복사 (리포트 생성기에 Ctrl+V)" onClick={() => handleCopyImage(m.content_url)}>
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(m)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 학생별 판서 */}
                            {studentMaterials.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <div className="p-1 rounded bg-blue-50"><User className="h-3.5 w-3.5 text-blue-600" /></div>
                                            학생별 판서
                                            <span className="text-xs text-muted-foreground font-normal">({studentMaterials.length}명)</span>
                                        </h3>
                                        <Button variant="ghost" size="sm" className="text-xs" onClick={expandAll}>
                                            전체 펼치기
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        {studentMaterials.map((student) => {
                                            const isExpanded = expandedStudents.has(student.studentId)
                                            return (
                                                <div key={student.studentId} className="border rounded-lg overflow-hidden">
                                                    <button
                                                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                                                        onClick={() => toggleStudent(student.studentId)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                                                {student.studentName.slice(0, 1)}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm">{student.studentName}</div>
                                                                <div className="text-[10px] text-muted-foreground">{student.materials.length}개 자료</div>
                                                            </div>
                                                        </div>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                                                            {student.materials.map((m: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background mt-2">
                                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                        <div className="h-7 w-7 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                                            <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                                                                        </div>
                                                                        <span className="text-sm truncate">{m.title || '판서'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {m.content_url && (
                                                                            <>
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="새 탭에서 열기" onClick={() => window.open(m.content_url, '_blank')}>
                                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="다운로드" onClick={() => handleDownload(m.content_url, m.title || `${student.studentName}_판서.png`)}>
                                                                                    <Download className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="이미지 복사 (리포트 생성기에 Ctrl+V)" onClick={() => handleCopyImage(m.content_url)}>
                                                                                    <Copy className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>

                    <Dialog open={isAddOpen} onOpenChange={(val) => { if (isSubmitting && !val) return; setIsAddOpen(val) }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsAddOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                자료 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent onPointerDownOutside={(e) => isSubmitting && e.preventDefault()} onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}>
                            <DialogHeader><DialogTitle>새 자료 추가</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>자료 제목</Label>
                                    <Input placeholder="예: 오늘 수업 복습 자료" value={title} onChange={(e) => setTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>자료 유형</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="link">웹 링크</SelectItem>
                                            <SelectItem value="video">동영상 (유튜브 등)</SelectItem>
                                            <SelectItem value="pdf">PDF 문서</SelectItem>
                                            <SelectItem value="ai_video">AI 복습 영상 (파일 업로드)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {type === 'ai_video' ? (
                                    <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg shrink-0"><FolderOpen className="h-5 w-5 text-blue-600" /></div>
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm">자동 업로드 폴더</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">아래 경로에 동영상 파일을 저장하면 자동으로 등록됩니다.</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 text-slate-50 p-3 rounded-md font-mono text-xs break-all">
                                            D:\OneDrive\학원 클래스인 강의실\{getFolderName()}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-100">
                                            <Zap className="h-3.5 w-3.5" />
                                            <span>파일이 저장되면 약 1-2분 내에 자동으로 처리됩니다.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>링크 주소 (URL)</Label>
                                        <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>취소</Button>
                                <Button onClick={handleAdd} disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {type === 'ai_video' ? '확인' : '추가하기'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
