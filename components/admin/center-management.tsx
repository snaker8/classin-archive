'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Building, MapPin, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCenters, createCenter, deleteCenter, Center } from '@/app/actions/center'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export function CenterManagement() {
    const [centers, setCenters] = useState<Center[]>([])
    const [loading, setLoading] = useState(true)
    const [newCenterName, setNewCenterName] = useState('')
    const [newHallName, setNewHallName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const res = await getCenters()
        if (res.centers) {
            setCenters(res.centers)
        }
        setLoading(false)
    }

    async function handleAdd(type: 'center' | 'hall') {
        const name = type === 'center' ? newCenterName : newHallName
        if (!name.trim()) return

        setSubmitting(true)
        const res = await createCenter(name.trim(), type)
        if (res.success) {
            if (type === 'center') setNewCenterName('')
            else setNewHallName('')
            await loadData()
            setIsAddDialogOpen(false)
        } else {
            alert(res.error)
        }
        setSubmitting(false)
    }

    async function handleDelete(e: React.MouseEvent, id: string) {
        e.stopPropagation() // Prevent triggering the card click
        if (!confirm('정말 삭제하시겠습니까? 관련 데이터가 모두 삭제될 수 있습니다.')) return

        const res = await deleteCenter(id)
        if (res.success) {
            await loadData()
        } else {
            alert(res.error)
        }
    }

    const selectCenter = (centerName: string) => {
        // Set the active center in cookies. Expires in 7 days for convenience.
        Cookies.set('active_center', centerName, { expires: 7, path: '/' })
        // Trigger a custom event in case layout needs to hear it instantly
        window.dispatchEvent(new Event('centerChanged'))
        // Navigate to the dashboard
        router.push('/admin/dashboard')
    }

    const selectAllCenters = () => {
        Cookies.set('active_center', '전체', { expires: 7, path: '/' })
        window.dispatchEvent(new Event('centerChanged'))
        router.push('/admin/dashboard')
    }

    const filteredCenters = centers.filter(c => c.type === 'center' && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const filteredHalls = centers.filter(c => c.type === 'hall')

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="센터 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> 센터/관 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새로운 센터 또는 관 추가</DialogTitle>
                            <DialogDescription>
                                시스템에 새로운 센터나 관을 등록합니다.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="center" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="center">센터 (Center)</TabsTrigger>
                                <TabsTrigger value="hall">관 (Hall)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="center" className="space-y-4">
                                <Input
                                    placeholder="새 센터 이름 (예: 동래센터)"
                                    value={newCenterName}
                                    onChange={e => setNewCenterName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd('center')}
                                />
                                <Button className="w-full" onClick={() => handleAdd('center')} disabled={submitting}>
                                    센터 추가
                                </Button>
                            </TabsContent>

                            <TabsContent value="hall" className="space-y-4">
                                <Input
                                    placeholder="새 관 이름 (예: 중등관)"
                                    value={newHallName}
                                    onChange={e => setNewHallName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd('hall')}
                                />
                                <Button className="w-full" onClick={() => handleAdd('hall')} disabled={submitting}>
                                    관 추가
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Special Card for All Centers */}
                <Card
                    className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    onClick={selectAllCenters}
                >
                    <CardHeader className="pb-3 text-center">
                        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Building className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <CardTitle>전체 관리</CardTitle>
                        <CardDescription>모든 센터 조회 및 통합 관리</CardDescription>
                    </CardHeader>
                </Card>

                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-32 bg-muted/50 rounded-t-lg"></CardHeader>
                        </Card>
                    ))
                ) : (
                    filteredCenters.map(center => (
                        <Card
                            key={center.id}
                            className="cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group border-muted relative overflow-hidden"
                            onClick={() => selectCenter(center.name)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-3 text-center relative z-10">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => handleDelete(e, center.id)}
                                        title="센터 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="mx-auto bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                    <MapPin className="w-6 h-6 text-indigo-500 drop-shadow-sm" />
                                </div>
                                <CardTitle className="text-xl">{center.name}</CardTitle>
                            </CardHeader>
                        </Card>
                    ))
                )}
            </div>

            {filteredCenters.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    검색된 센터가 없거나 등록된 센터가 없습니다.
                </div>
            )}

            {/* Optional: Keep halls visible smaller at the bottom for reference if needed, or remove them from UI to focus just on centers. Let's keep them small at the bottom for now. */}
            {filteredHalls.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" /> 보조 레이블 (관)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {filteredHalls.map(hall => (
                            <div key={hall.id} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm border hover:border-foreground/20 transition-colors">
                                <span>{hall.name}</span>
                                <button
                                    onClick={(e) => handleDelete(e, hall.id)}
                                    className="text-muted-foreground hover:text-destructive p-0.5 rounded-full"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

