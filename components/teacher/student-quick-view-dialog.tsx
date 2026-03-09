'use client'

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { School, Phone, CalendarDays } from "lucide-react"

interface StudentQuickViewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student: any | null
}

export function StudentQuickViewDialog({ open, onOpenChange, student }: StudentQuickViewDialogProps) {
    if (!student) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-border bg-card shadow-2xl">
                <div className="bg-primary/5 p-10 flex flex-col items-center justify-center text-center relative">
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
                    <div className="h-28 w-28 rounded-[2rem] bg-background border-4 border-card shadow-xl flex items-center justify-center text-4xl font-black text-primary relative z-10 overflow-hidden mb-5">
                        {student.avatar_url ? (
                            <img src={student.avatar_url} alt={student.full_name || ''} className="h-full w-full object-cover" />
                        ) : (
                            student.full_name?.slice(0, 1)
                        )}
                    </div>
                    <DialogTitle className="text-3xl font-black text-foreground relative z-10 tracking-tight">{student.full_name}</DialogTitle>
                    <p className="text-[10px] font-black text-primary mt-2 relative z-10 uppercase tracking-[0.2em] bg-primary/10 px-4 py-1.5 rounded-full">Student Member</p>
                </div>

                <div className="p-8 space-y-6 pb-10">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-5 p-4 rounded-3xl bg-muted/40 border border-transparent hover:border-border transition-colors group">
                            <div className="h-12 w-12 rounded-[1rem] bg-background shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <School className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-muted-foreground">School / Grade</p>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {student.school || '-'} / {student.grade || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 p-4 rounded-3xl bg-muted/40 border border-transparent hover:border-border transition-colors group">
                            <div className="h-12 w-12 rounded-[1rem] bg-background shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <Phone className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-muted-foreground">Phone</p>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {student.phone_number || '등록된 번호 없음'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 p-4 rounded-3xl bg-muted/40 border border-transparent hover:border-border transition-colors group">
                            <div className="h-12 w-12 rounded-[1rem] bg-background shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-muted-foreground">Joined</p>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {student.created_at ? format(new Date(student.created_at), 'yyyy년 MM월 dd일') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
