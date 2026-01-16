'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Profile, Class } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, BookOpen, Plus, Upload, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AdminDashboard() {
  const router = useRouter()
  const [students, setStudents] = useState<Profile[]>([])
  const [recentClasses, setRecentClasses] = useState<(Class & { student: Profile })[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalMaterials: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load students
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      // Load recent classes with student info
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          student:profiles!classes_student_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load stats
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      const { count: materialCount } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })

      setStudents(studentsData || [])
      setRecentClasses(classesData as any || [])
      setStats({
        totalStudents: studentsData?.length || 0,
        totalClasses: classCount || 0,
        totalMaterials: materialCount || 0,
      })
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
          <p className="mt-4 text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">대시보드</h2>
          <p className="text-muted-foreground">학생 및 수업 관리</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/admin/students/new')}>
            <Plus className="h-4 w-4 mr-2" />
            학생 추가
          </Button>
          <Button onClick={() => router.push('/admin/classes/new')}>
            <Upload className="h-4 w-4 mr-2" />
            수업 업로드
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">등록된 학생 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 수업</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">업로드된 수업 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 자료</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">이미지 및 영상</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Classes */}
      <Card>
        <CardHeader>
          <CardTitle>최근 업로드된 수업</CardTitle>
          <CardDescription>가장 최근에 추가된 수업 목록</CardDescription>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/classes/${cls.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{cls.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      {cls.student?.full_name}
                      <span className="mx-2">•</span>
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(cls.class_date)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    자세히 보기
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
          <CardDescription>등록된 전체 학생</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              등록된 학생이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{student.full_name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/classes/new?student=${student.id}`)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    수업 추가
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
