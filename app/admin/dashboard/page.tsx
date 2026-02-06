'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, Class } from '@/lib/supabase/client'
import { getDashboardData } from '@/app/actions/dashboard'
import { getCenters } from '@/app/actions/center'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, Plus, Upload, Calendar, FolderInput } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AdminDashboard() {
  const router = useRouter()
  // We don't need full student list here anymore, just stats and recent classes
  // But getDashboardData currently returns everything. We can optimize later.
  const [recentClasses, setRecentClasses] = useState<(Class & { student: Profile })[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalMaterials: 0,
  })
  const [center, setCenter] = useState('전체')
  const [hall, setHall] = useState('전체')
  const [availableCenters, setAvailableCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCenters() {
      const res = await getCenters()
      if (res.centers) {
        setAvailableCenters(res.centers)
      }
    }
    loadCenters()
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [center, hall])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await getDashboardData(
        center === '전체' ? undefined : center,
        hall === '전체' ? undefined : hall
      )

      setRecentClasses(data.recentClasses as any)
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">처리 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground tracking-tight">대시보드</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">학생 및 수업 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={center}
            onChange={(e) => setCenter(e.target.value)}
            className="p-2 border rounded-md bg-white text-sm h-10 w-full sm:w-40 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          >
            <option value="전체">전체 센터</option>
            {availableCenters
              .filter(c => c.type === 'center')
              .map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))
            }
          </select>
          <select
            value={hall}
            onChange={(e) => setHall(e.target.value)}
            className="p-2 border rounded-md bg-white text-sm h-10 w-full sm:w-40 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          >
            <option value="전체">전체 관</option>
            {availableCenters
              .filter(c => c.type === 'hall')
              .map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 mb-8">
        <Button onClick={() => router.push('/admin/students/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
          <Plus className="h-4 w-4 mr-2" />
          학생 추가
        </Button>
        <Button onClick={() => router.push('/admin/classes/new')} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Upload className="h-4 w-4 mr-2" />
          수업 업로드
        </Button>
        <Button variant="ghost" onClick={() => router.push('/admin/classes/batch')} size="icon" className="hidden sm:inline-flex">
          <FolderInput className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          className="relative overflow-hidden border-indigo-100 bg-white/70 backdrop-blur-md cursor-pointer hover:bg-indigo-50/50 transition-colors"
          onClick={() => router.push('/admin/students')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="h-24 w-24 text-indigo-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">전체 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">현재 등록된 학생 (클릭하여 관리)</p>
          </CardContent>
        </Card>

        <Card
          className="relative overflow-hidden border-violet-100 bg-white/70 backdrop-blur-md cursor-pointer hover:bg-violet-50/50 transition-colors"
          onClick={() => router.push('/admin/classes')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen className="h-24 w-24 text-violet-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-600">반 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground opacity-0">.</div>
            <p className="text-xs text-muted-foreground mt-1 absolute bottom-6">반 생성, 수정 및 삭제, 수업 자료 관리</p>
          </CardContent>
        </Card>

        <Card
          className="relative overflow-hidden border-emerald-100 bg-white/70 backdrop-blur-md cursor-pointer hover:bg-emerald-50/50 transition-colors"
          onClick={() => router.push('/admin/materials')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Upload className="h-24 w-24 text-emerald-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">전체 자료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground mt-1">이미지, 영상 자료 (클릭하여 관리)</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Classes - Keeping this for quick access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 업로드된 수업</CardTitle>
            <CardDescription>가장 최근에 추가된 수업 목록</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/classes')}>
            전체 보기
          </Button>
        </CardHeader>
        <CardContent>
          {recentClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              아직 업로드된 수업이 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {recentClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer gap-4"
                  onClick={() => router.push(`/viewer/${cls.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cls.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center mt-1 gap-y-1">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        <span
                          className="hover:underline cursor-pointer text-primary hover:text-blue-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (cls.student?.id) {
                              router.push(`/admin/students/${cls.student.id}`)
                            }
                          }}
                        >
                          {cls.student?.full_name}
                        </span>
                      </div>
                      <span className="mx-2 hidden sm:inline">•</span>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(cls.class_date)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    자세히 보기
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
