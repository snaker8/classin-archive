'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, Class } from '@/lib/supabase/client'
import { getDashboardData } from '@/app/actions/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, BookOpen, Plus, Upload, Calendar, FolderInput } from 'lucide-react'
import { formatDate } from '@/lib/utils'

import { StudentEditDialog } from '@/components/admin/student-edit-dialog'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState('')
  const [uniqueClassTitles, setUniqueClassTitles] = useState<string[]>([])
  const [studentClassMap, setStudentClassMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const data = await getDashboardData()

      setStudents(data.students)
      setRecentClasses(data.recentClasses as any)
      setStats(data.stats)
      setUniqueClassTitles(data.uniqueClassTitles || [])
      setStudentClassMap(data.studentClassMap || {})
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesClass = !selectedClassFilter ||
      (studentClassMap[student.id] && studentClassMap[student.id].includes(selectedClassFilter))

    return matchesSearch && matchesClass
  })

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const toggleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedStudents(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return
    if (!confirm(`선택한 ${selectedStudents.size}명의 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return

    setLoading(true)
    try {
      const { deleteStudents } = await import('@/app/actions/student')
      const result = await deleteStudents(Array.from(selectedStudents))
      if (result.success) {
        setSelectedStudents(new Set())
        await loadDashboardData()
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error(error)
      alert('삭제 실패')
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">대시보드</h2>
          <p className="text-muted-foreground">학생 및 수업 관리</p>
        </div>
        <div className="flex space-x-2">
          {selectedStudents.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              선택한 {selectedStudents.size}명 삭제
            </Button>
          )}
          <Button onClick={() => router.push('/admin/students/new')}>
            <Plus className="h-4 w-4 mr-2" />
            학생 추가
          </Button>
          <Button onClick={() => router.push('/admin/classes/new')}>
            <Upload className="h-4 w-4 mr-2" />
            수업 업로드
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/classes/batch')}>
            <FolderInput className="h-4 w-4 mr-2" />
            스마트 폴더 업로드
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/groups')}>
            <Users className="h-4 w-4 mr-2" />
            반 관리
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/students/batch')}>
            <Users className="h-4 w-4 mr-2" />
            일괄 등록
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 업로드된 수업</CardTitle>
            <CardDescription>가장 최근에 추가된 수업 목록</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/history')}>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/viewer/${cls.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{cls.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>학생 목록</CardTitle>
            <CardDescription>등록된 전체 학생</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {filteredStudents.length > 0 && (
              <div className="flex items-center mr-4">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="mr-2 h-4 w-4"
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleSelectAll}
                />
                <label htmlFor="selectAll" className="text-sm cursor-pointer select-none">전체 선택</label>
              </div>
            )}
            <div className="w-64">
              <Input
                placeholder="이름 또는 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {uniqueClassTitles.length > 0 && (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="p-2 border rounded-md bg-white text-sm"
              >
                <option value="">모든 반</option>
                {uniqueClassTitles.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>


        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
            </p>
          ) : (

            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${selectedStudents.has(student.id) ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleSelectStudent(student.id)}
                    />
                    <div>
                      <div
                        className="font-medium hover:underline cursor-pointer text-primary"
                        onClick={() => router.push(`/admin/students/${student.id}`)}
                      >
                        {student.full_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <StudentEditDialog
                      student={student}
                      onSuccess={loadDashboardData}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/classes/new?student=${student.id}`)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      수업 추가
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`정말 '${student.full_name}' 학생을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) {
                          const { deleteStudent } = await import('@/app/actions/student')
                          const result = await deleteStudent(student.id)
                          if (result.success) {
                            loadDashboardData()
                          } else {
                            alert(result.error)
                          }
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
