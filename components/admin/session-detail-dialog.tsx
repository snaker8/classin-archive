'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Video, Link as LinkIcon, ExternalLink, Trash2, Plus, Loader2 } from 'lucide-react'
import { getSessionDetails, addMaterialToSession, deleteMaterialFromSession } from '@/app/actions/group'

interface SessionDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: {
        class_ids: string[]
        title: string
    } | null
    onUpdate?: () => void
}

export function SessionDetailDialog({ open, onOpenChange, session, onUpdate }: SessionDetailDialogProps) {
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Add Material State
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [type, setType] = useState('link')
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open && session) {
            loadMaterials()
        }
    }, [open, session])

    async function loadMaterials() {
        if (!session) return
        setLoading(true)
        try {
            const res = await getSessionDetails(session.class_ids)
            if (res.materials) {
                setMaterials(res.materials)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!title || !url) {
            alert('제목과 링크를 입력해주세요.')
            return
        }
        if (!session) return

        setIsSubmitting(true)
        try {
            const res = await addMaterialToSession(session.class_ids, {
                type,
                title,
                url
            })

            if (res.success) {
                await loadMaterials()
                setIsAddOpen(false)
                setTitle('')
                setUrl('')
                if (onUpdate) onUpdate()
            } else {
                alert(res.error)
            }
        } catch (e) {
            console.error(e)
            alert('실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(material: any) {
        if (!confirm(`'${material.title}' 자료를 삭제하시겠습니까?`)) return
        if (!session) return

        try {
            const res = await deleteMaterialFromSession(session.class_ids, {
                title: material.title,
                type: material.type
            })

            if (res.success) {
                await loadMaterials()
                if (onUpdate) onUpdate()
            } else {
                alert(res.error)
            }
        } catch (e) {
            console.error(e)
        }
    }

    if (!session) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{session.title} - 자료 관리</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            자료 로딩 중...
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <FileText className="h-8 w-8 opacity-20" />
                            등록된 자료가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-2 p-1">
                            {materials.map((material, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                            {material.type === 'video' ? <Video className="h-4 w-4" /> :
                                                material.type === 'link' ? <LinkIcon className="h-4 w-4" /> :
                                                    <FileText className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{material.title}</div>
                                            <div className="text-xs text-muted-foreground truncate opacity-70 flex items-center gap-1">
                                                {material.type.toUpperCase()}
                                                {material.url && (
                                                    <a href={material.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5 ml-1">
                                                        Open <ExternalLink className="h-2 w-2" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(material)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        닫기
                    </Button>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>새 자료 추가</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>자료 제목</Label>
                                    <Input
                                        placeholder="예: 오늘 수업 복습 자료"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>자료 유형</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="link">웹 링크</SelectItem>
                                            <SelectItem value="video">동영상 (유튜브 등)</SelectItem>
                                            <SelectItem value="pdf">PDF 문서</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>링크 (URL)</Label>
                                    <Input
                                        placeholder="https://..."
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAdd} disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    추가하기
                                </Button>
                            </DialogFooter>
                        </DialogContent>

                        {/* Trigger button inside footer to open the nested dialog */}
                        <Button onClick={() => setIsAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            자료 추가
                        </Button>
                    </Dialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
