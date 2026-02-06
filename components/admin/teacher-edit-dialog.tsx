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
import { Settings, Loader2 } from 'lucide-react'
import { updateTeacher } from '@/app/actions/teacher'
import { useToast } from '@/components/ui/use-toast'

interface TeacherEditDialogProps {
    teacher: {
        id: string
        name: string
        center?: string
        hall?: string
    }
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function TeacherEditDialog({ teacher, onSuccess, trigger }: TeacherEditDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(teacher.name)
    const [center, setCenter] = useState(teacher.center || '')
    const [hall, setHall] = useState(teacher.hall || '')
    const [availableCenters, setAvailableCenters] = useState<any[]>([])

    const { toast } = useToast()

    const loadCenters = async () => {
        const { getCenters } = await import('@/app/actions/center')
        const res = await getCenters()
        if (res.centers) {
            setAvailableCenters(res.centers)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await updateTeacher(teacher.id, {
                name: name !== teacher.name ? name : undefined,
                center: center !== teacher.center ? center : undefined,
                hall: hall !== teacher.hall ? hall : undefined
            })

            if (result.error) {
                toast({
                    title: "수정 실패",
                    description: result.error,
                    variant: "destructive",
                })
                return
            }

            toast({
                title: "수정 완료",
                description: "선생님 정보가 성공적으로 수정되었습니다.",
            })

            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error(error)
            toast({
                title: "오류 발생",
                description: "알 수 없는 오류가 발생했습니다.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (val) loadCenters()
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3 mr-1" />
                        관리
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>선생님 정보 수정</DialogTitle>
                        <DialogDescription>
                            선생님의 기본 정보를 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                이름
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="center" className="text-right">
                                센터
                            </Label>
                            <select
                                id="center"
                                value={center}
                                onChange={(e) => setCenter(e.target.value)}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">선택 안함</option>
                                {availableCenters.filter(c => c.type === 'center').map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hall" className="text-right">
                                관
                            </Label>
                            <select
                                id="hall"
                                value={hall}
                                onChange={(e) => setHall(e.target.value)}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">선택 안함</option>
                                {availableCenters.filter(c => c.type === 'hall').map(h => (
                                    <option key={h.id} value={h.name}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            저장
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
