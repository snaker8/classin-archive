'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateClass } from '@/app/actions/class'
import { Edit2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ClassEditDialogProps {
    cls: {
        id: string
        title: string
        description: string | null
        class_date: string
    }
    onSuccess: () => void
}

export function ClassEditDialog({ cls, onSuccess }: ClassEditDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [formData, setFormData] = useState({
        title: cls.title,
        description: cls.description || '',
        class_date: cls.class_date,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await updateClass(cls.id, formData)

            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "오류",
                    description: result.error
                })
            } else {
                toast({
                    title: "성공",
                    description: "수업 정보가 수정되었습니다."
                })
                setOpen(false)
                onSuccess()
            }
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "오류",
                description: "알 수 없는 오류가 발생했습니다."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex-1 rounded-none px-4 py-3 h-auto sm:py-0 hover:bg-blue-50 hover:text-blue-600"
                >
                    <Edit2 className="h-4 w-4 mr-2" />
                    수정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>수업 정보 수정</DialogTitle>
                    <DialogDescription>
                        수업 제목, 설명, 날짜를 수정합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">수업 제목</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">수업 날짜</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.class_date}
                            onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">설명</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            저장
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
