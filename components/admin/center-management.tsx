'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Building, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCenters, createCenter, deleteCenter, Center } from '@/app/actions/center'

export function CenterManagement() {
    const [centers, setCenters] = useState<Center[]>([])
    const [loading, setLoading] = useState(true)
    const [newCenterName, setNewCenterName] = useState('')
    const [newHallName, setNewHallName] = useState('')
    const [submitting, setSubmitting] = useState(false)

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
        } else {
            alert(res.error)
        }
        setSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('정말 삭제하시겠습니까?')) return

        const res = await deleteCenter(id)
        if (res.success) {
            await loadData()
        } else {
            alert(res.error)
        }
    }

    const filteredCenters = centers.filter(c => c.type === 'center')
    const filteredHalls = centers.filter(c => c.type === 'hall')

    return (
        <Card>
            <CardHeader>
                <CardTitle>센터 및 관 관리</CardTitle>
                <CardDescription>
                    학생과 선생님을 분류할 센터와 관을 관리합니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="center" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="center">센터 (Center)</TabsTrigger>
                        <TabsTrigger value="hall">관 (Hall)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="center" className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="새 센터 이름 (예: 동래센터)"
                                value={newCenterName}
                                onChange={e => setNewCenterName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd('center')}
                            />
                            <Button onClick={() => handleAdd('center')} disabled={submitting}>
                                <Plus className="w-4 h-4 mr-2" />
                                추가
                            </Button>
                        </div>

                        <div className="rounded-md border divide-y">
                            {filteredCenters.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    등록된 센터가 없습니다.
                                </div>
                            ) : (
                                filteredCenters.map(center => (
                                    <div key={center.id} className="p-3 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            <span className="font-medium">{center.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(center.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="hall" className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="새 관 이름 (예: 중등관)"
                                value={newHallName}
                                onChange={e => setNewHallName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd('hall')}
                            />
                            <Button onClick={() => handleAdd('hall')} disabled={submitting}>
                                <Plus className="w-4 h-4 mr-2" />
                                추가
                            </Button>
                        </div>

                        <div className="rounded-md border divide-y">
                            {filteredHalls.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    등록된 관이 없습니다.
                                </div>
                            ) : (
                                filteredHalls.map(hall => (
                                    <div key={hall.id} className="p-3 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4 text-violet-500" />
                                            <span className="font-medium">{hall.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(hall.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
