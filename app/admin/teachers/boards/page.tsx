'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Plus,
    Calendar as CalendarIcon,
    Users,
    Upload,
    Loader2,
    MoreHorizontal,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import {
    getTeacherMasterBoards,
    uploadTeacherMasterBoard,
    distributeFromMaster,
    getTeachers
} from '@/app/actions/teacher'
import { getGroups } from '@/app/actions/group'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function TeacherBoardsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [boards, setBoards] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [teachers, setTeachers] = useState<any[]>([])

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedTeacher, setSelectedTeacher] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    // Distribute State
    const [isDistributeOpen, setIsDistributeOpen] = useState(false)
    const [selectedBoard, setSelectedBoard] = useState<any>(null)
    const [distributeGroup, setDistributeGroup] = useState('all')
    const [distributing, setDistributing] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [boardsRes, groupsRes, teachersRes] = await Promise.all([
            getTeacherMasterBoards(),
            getGroups(),
            getTeachers()
        ])

        if (boardsRes.boards) setBoards(boardsRes.boards)
        if (groupsRes.groups) setGroups(groupsRes.groups)
        if (teachersRes.teachers) setTeachers(teachersRes.teachers)
        setLoading(false)
    }

    async function handleUpload() {
        if (!selectedFile || !uploadDate) {
            toast({ title: '입력 확인', description: '파일과 날짜를 확인해주세요.', variant: 'destructive' })
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('date', uploadDate)
        formData.append('teacherId', selectedTeacher)

        const res = await uploadTeacherMasterBoard(formData)

        if (res.success) {
            toast({ title: '업로드 성공', description: '선생님 칠판 보관함에 저장되었습니다.' })
            setIsUploadOpen(false)
            setSelectedFile(null)
            loadData()
        } else {
            toast({ title: '업로드 실패', description: res.error, variant: 'destructive' })
        }
        setUploading(false)
    }

    async function handleDistribute() {
        if (!selectedBoard) return

        setDistributing(true)
        const res = await distributeFromMaster(selectedBoard.id, distributeGroup)

        if (res.success) {
            toast({
                title: '배포 완료',
                description: (res.count ?? 0) > 0
                    ? `${res.count}개의 수업에 배포되었습니다.`
                    : res.message || '변경 사항이 없습니다.'
            })
            setIsDistributeOpen(false)
            loadData()
        } else {
            toast({ title: '배포 실패', description: res.error, variant: 'destructive' })
        }
        setDistributing(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/teachers')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        돌아가기
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">선생님 칠판 관리</h1>
                        <p className="text-muted-foreground text-sm">
                            모든 선생님 칠판 자료를 관리하고 일괄 배포합니다.
                        </p>
                    </div>
                </div>

                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            보관함에 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 칠판 자료 추가</DialogTitle>
                            <DialogDescription>
                                수업 날짜를 지정하여 보관함에 업로드합니다. 이후 수동 배포가 가능합니다.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>수업 날짜</Label>
                                <Input
                                    type="date"
                                    value={uploadDate}
                                    onChange={(e) => setUploadDate(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>선생님 (선택)</Label>
                                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="선생님 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">지정 안함</SelectItem>
                                        {teachers.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>파일 업로드</Label>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    />
                                    {selectedFile ? (
                                        <div className="text-sm">
                                            <p className="font-semibold text-primary">{selectedFile.name}</p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                            <p>이미지 파일을 선택하세요</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>취소</Button>
                            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                업로드
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">보관함 불러오는 중...</p>
                </div>
            ) : boards.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                    <p className="text-lg font-medium">보관함이 비어있습니다.</p>
                    <p className="text-muted-foreground mb-4">자동 업로드된 자료나 수동 업로드 자료가 여기에 표시됩니다.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {boards.map((board) => (
                        <Card key={board.id} className="overflow-hidden group hover:shadow-lg transition-all border-muted">
                            <div className="aspect-[4/3] relative bg-gray-100 overflow-hidden">
                                <img
                                    src={board.content_url}
                                    alt="Blackboard"
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 right-2">
                                    {board.usage_count > 0 ? (
                                        <Badge className="bg-green-500/90 hover:bg-green-500 border-none">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            {board.usage_count}명 배포됨
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="bg-red-500/90 hover:bg-red-500 border-none">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            미배포
                                        </Badge>
                                    )}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-center text-white">
                                        <span className="text-xs truncate max-w-[150px]">{board.filename}</span>
                                        <a href={board.content_url} target="_blank" rel="noreferrer" className="p-1 hover:bg-white/20 rounded">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-sm font-medium">{formatDate(board.class_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {board.teacher?.name || '담당 교사 미지정'}
                                            </span>
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setSelectedBoard(board)
                                                setIsDistributeOpen(true)
                                            }}>
                                                <Send className="w-4 h-4 mr-2" />
                                                수업에 배포
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                                삭제
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 text-xs h-8"
                                    onClick={() => {
                                        setSelectedBoard(board)
                                        setIsDistributeOpen(true)
                                    }}
                                >
                                    {board.usage_count > 0 ? '추가 배포하기' : '지금 배포하기'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Distribute Dialog */}
            <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>수업 자료 배포</DialogTitle>
                        <DialogDescription>
                            이 칠판 자료를 <strong>{formatDate(selectedBoard?.class_date)}</strong> 수업을 듣는 학생들에게 등록합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                            <div className="w-20 aspect-video bg-gray-200 rounded overflow-hidden">
                                <img src={selectedBoard?.content_url} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold">{selectedBoard?.filename}</p>
                                <p className="text-xs text-muted-foreground">날짜: {formatDate(selectedBoard?.class_date)}</p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>배포 대상 반 (필터)</Label>
                            <Select value={distributeGroup} onValueChange={setDistributeGroup}>
                                <SelectTrigger>
                                    <SelectValue placeholder="모든 반" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">해당 날짜 모든 수업</SelectItem>
                                    {groups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(selectedBoard?.class_date)}에 수업이 생성된 학생들 중 조건에 맞는 학생들에게 배포됩니다.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDistributeOpen(false)}>취소</Button>
                        <Button onClick={handleDistribute} disabled={distributing}>
                            {distributing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            배포 실행
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

