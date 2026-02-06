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
import { updateStudent } from '@/app/actions/student'
import { useToast } from '@/components/ui/use-toast'

interface StudentEditDialogProps {
    student: {
        id: string
        full_name: string
        email: string
    }
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function StudentEditDialog({ student, onSuccess, trigger }: StudentEditDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fullName, setFullName] = useState(student.full_name)
    const [password, setPassword] = useState('')
    const [center, setCenter] = useState((student as any).center || '')
    const [hall, setHall] = useState((student as any).hall || '')
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
            const result = await updateStudent(student.id, {
                fullName: fullName !== student.full_name ? fullName : undefined,
                password: password || undefined,
                center: center !== (student as any).center ? center : undefined,
                hall: hall !== (student as any).hall ? hall : undefined
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
                description: "학생 정보가 성공적으로 수정되었습니다.",
            })

            setOpen(false)
            setPassword('') // Reset password field
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
                        정보 수정
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>학생 정보 수정</DialogTitle>
                        <DialogDescription>
                            {student.email} 계정의 정보를 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                이름
                            </Label>
                            <Input
                                id="name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                새 비밀번호
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="변경시에만 입력하세요"
                                className="col-span-3"
                                minLength={6}
                            />
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
