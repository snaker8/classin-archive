'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Users, BookOpen, GraduationCap, FileText, ArrowRight, TrendingUp, Clock, Activity, Trash2, AlertTriangle } from 'lucide-react'
import { getStudents } from '@/app/actions/student'
import { getGroups } from '@/app/actions/group'
import { getTeachers } from '@/app/actions/teacher'
import { getDashboardData } from '@/app/actions/dashboard'
import { deleteAllClassData } from '@/app/actions/admin-management'
import { formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState({
    students: 0,
    groups: 0,
    teachers: 0,
    classes: 0,
    videos: 0,
    blackboards: 0,
    totalMaterials: 0,
  })
  const [recentClasses, setRecentClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [groupsRes, teachersRes, dashboardData] = await Promise.all([
        getGroups(),
        getTeachers(),
        getDashboardData()
      ])

      setStats({
        students: dashboardData.stats.totalStudents || 0,
        groups: groupsRes.groups?.length || 0,
        teachers: teachersRes.teachers?.length || 0,
        classes: dashboardData.stats.totalClasses || 0,
        totalMaterials: dashboardData.stats.totalMaterials || 0,
        videos: dashboardData.stats.videoCount || 0,
        blackboards: dashboardData.stats.blackboardCount || 0,
      })

      setRecentClasses(dashboardData.recentClasses || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
    setLoading(false)
  }

  const statCards = [
    { label: '전체 학생', value: stats.students, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', href: '/admin/students' },
    { label: '활성 반', value: stats.groups, icon: BookOpen, color: 'text-violet-600', bgColor: 'bg-violet-50', href: '/admin/groups' },
    { label: '선생님', value: stats.teachers, icon: GraduationCap, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: '/admin/teachers' },
    {
      label: '전체 수업자료',
      value: stats.totalMaterials,
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      href: '/admin/materials',
      description: `영상: ${stats.videos}개 / 판서: ${stats.blackboards}개`
    },
  ]

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">관리자 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 현황을 한눈에 확인하세요</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="h-full"
          >
            <Card
              className="border hover:shadow-lg transition-all cursor-pointer group overflow-hidden h-full"
              onClick={() => router.push(stat.href)}
            >
              <CardContent className="p-5 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    {stat.description ? (
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.description}</p>
                    ) : (
                      <div className="h-[15px]" /> // Placeholder to keep height consistent
                    )}
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <span className="group-hover:text-primary transition-colors">자세히 보기</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  최근 수업자료
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">가장 최근 등록된 수업 자료</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/materials')}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                전체 보기
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentClasses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  아직 등록된 수업이 없습니다.
                </div>
              ) : (
                <div className="divide-y">
                  {recentClasses.map((cls, idx) => (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/viewer/${cls.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {cls.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{cls.student?.full_name}</span>
                            <span>•</span>
                            <span>{formatDate(cls.class_date)}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                빠른 작업
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">자주 사용하는 기능 바로가기</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => router.push('/admin/students/new')}
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-xs">학생 추가</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => router.push('/admin/students/batch')}
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-xs">엑셀 등록</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => router.push('/admin/groups')}
                >
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-xs">반 관리</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => router.push('/admin/reports')}
                >
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-xs">리포트 생성</span>
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 hover:border-destructive/50 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={loading}
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="text-xs">데이터 초기화</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        전체 데이터 초기화
                      </DialogTitle>
                      <DialogDescription>
                        정말로 모든 수업 자료, 노트, 판서 기록을 삭제하시겠습니까?
                        <br />
                        <span className="font-bold text-destructive">이 작업은 취소할 수 없습니다.</span>
                        <br />
                        (학생 및 선생님 기본 정보는 유지됩니다.)
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose asChild>
                        <Button variant="outline">취소</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          setLoading(true);
                          const res = await deleteAllClassData();
                          if (res.success) {
                            toast({
                              title: "초기화 완료",
                              description: "모든 데이터가 초기화되었습니다.",
                            });
                            loadData(); // Dashboard stats reload
                          } else {
                            toast({
                              title: "초기화 실패",
                              description: res.error || "알 수 없는 오류가 발생했습니다.",
                              variant: "destructive",
                            });
                          }
                          setLoading(false);
                        }}
                      >
                        초기화 실행
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
