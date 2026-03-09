'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { getNotesByClass, deleteNote } from '@/app/actions/note'
import { NoteEditorDialog } from './note-editor-dialog'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
    StickyNote, Trash2, Edit2, Loader2,
    FileText, User, Clock, Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Note {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    author: {
        full_name: string
        role: string
    } | null
}

interface NoteListProps {
    classId: string
    showAddButton?: boolean
    compact?: boolean
}

export function NoteList({ classId, showAddButton = true, compact = false }: NoteListProps) {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)
    const { toast } = useToast()

    const loadNotes = async () => {
        setLoading(true)
        try {
            const result = await getNotesByClass(classId)
            setNotes(result.notes || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (classId) {
            loadNotes()
        }
    }, [classId])

    const handleDelete = async (noteId: string) => {
        if (!confirm('이 노트를 삭제하시겠습니까?')) return

        setDeleting(noteId)
        try {
            const result = await deleteNote(noteId)
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
                description: "노트가 삭제되었습니다."
            })
            loadNotes()
        } catch (error) {
            console.error(error)
        } finally {
            setDeleting(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {showAddButton && (
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <StickyNote className="h-4 w-4" />
                        노트 ({notes.length})
                    </h3>
                    <NoteEditorDialog
                        classId={classId}
                        onSuccess={loadNotes}
                        trigger={
                            <Button size="sm" variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                새 노트
                            </Button>
                        }
                    />
                </div>
            )}

            {notes.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">아직 작성된 노트가 없습니다.</p>
                        {showAddButton && (
                            <NoteEditorDialog
                                classId={classId}
                                onSuccess={loadNotes}
                                trigger={
                                    <Button
                                        size="sm"
                                        variant="link"
                                        className="mt-2 text-amber-600"
                                    >
                                        첫 노트 작성하기
                                    </Button>
                                }
                            />
                        )}
                    </CardContent>
                </Card>
            ) : (
                <AnimatePresence mode="popLayout">
                    <div className={cn("space-y-3", compact && "space-y-2")}>
                        {notes.map((note, idx) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className={cn(
                                    "border hover:shadow-md transition-all group",
                                    compact && "shadow-none hover:shadow-sm"
                                )}>
                                    <CardContent className={cn("p-4", compact && "p-3")}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn(
                                                    "font-medium text-foreground line-clamp-1",
                                                    compact ? "text-sm" : "text-base"
                                                )}>
                                                    {note.title || '제목 없음'}
                                                </h4>
                                                <p className={cn(
                                                    "text-muted-foreground mt-1 whitespace-pre-wrap",
                                                    compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"
                                                )}>
                                                    {note.content}
                                                </p>

                                                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                                    {note.author && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {note.author.full_name}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(note.updated_at), 'M/d HH:mm', { locale: ko })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <NoteEditorDialog
                                                    classId={classId}
                                                    existingNote={note}
                                                    onSuccess={loadNotes}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(note.id)}
                                                    disabled={deleting === note.id}
                                                >
                                                    {deleting === note.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}
        </div>
    )
}
