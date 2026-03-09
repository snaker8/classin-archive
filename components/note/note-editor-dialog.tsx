'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createNote, updateNote } from '@/app/actions/note'
import { getCurrentUser } from '@/lib/supabase/client'
import { StickyNote, Loader2, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteEditorDialogProps {
    classId: string
    existingNote?: {
        id: string
        title: string
        content: string
    } | null
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function NoteEditorDialog({
    classId,
    existingNote = null,
    trigger,
    onSuccess
}: NoteEditorDialogProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const { toast } = useToast()

    const isEditing = !!existingNote

    useEffect(() => {
        if (open) {
            setTitle(existingNote?.title || '')
            setContent(existingNote?.content || '')
            // Get current user ID
            getCurrentUser().then(user => {
                setUserId(user?.id || null)
            })
        }
    }, [open, existingNote])

    const handleSave = async () => {
        if (!content.trim()) {
            toast({
                variant: "destructive",
                title: "오류",
                description: "내용을 입력해주세요."
            })
            return
        }

        if (!userId && !isEditing) {
            toast({
                variant: "destructive",
                title: "오류",
                description: "로그인이 필요합니다."
            })
            return
        }

        setSaving(true)
        try {
            const result = isEditing
                ? await updateNote(existingNote!.id, title, content, userId || undefined)
                : await createNote(classId, title, content, userId!)

            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "오류",
                    description: result.error
                })
                return
            }

            toast({
                title: "성공",
                description: isEditing ? "노트가 수정되었습니다." : "노트가 저장되었습니다."
            })

            setOpen(false)
            setTitle('')
            setContent('')
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "오류",
                description: "저장 중 오류가 발생했습니다."
            })
        } finally {
            setSaving(false)
        }
    }

    const defaultTrigger = (
        <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
            <StickyNote className="h-4 w-4" />
            <span className="hidden sm:inline">노트</span>
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-50">
                            <StickyNote className="h-5 w-5 text-amber-600" />
                        </div>
                        {isEditing ? '노트 수정' : '새 노트 작성'}
                    </DialogTitle>
                    <DialogDescription>
                        수업에 대한 메모, 피드백, 또는 학습 내용을 기록하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-4 py-4 overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor="note-title">제목 (선택)</Label>
                        <Input
                            id="note-title"
                            placeholder="노트 제목..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="focus-visible:ring-amber-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note-content">내용</Label>
                        <Textarea
                            id="note-content"
                            placeholder="노트 내용을 입력하세요..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className={cn(
                                "min-h-[200px] resize-none focus-visible:ring-amber-500",
                                "font-mono text-sm leading-relaxed"
                            )}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {content.length}자
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={saving}
                    >
                        <X className="h-4 w-4 mr-2" />
                        취소
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {saving ? '저장 중...' : '저장'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
