"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  GraduationCap,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  QrCode,
  Loader2,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useDashboardStats } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface Course { id: string; code: string; title: string; _count: { enrollments: number; sessions: number } }
interface AttendanceSession { id: string; lecturerId: string; isActive: boolean; _count: { records: number }; course: { id: string; code: string; title: string } }
interface ReportRecord {
  id: string
  markedAt: string
  method: string
  student: { firstName: string; lastName: string; matricNo: string; department?: { name: string; code: string } }
  session: { course: { code: string; title: string; department?: { name: string; code: string } } }
}

const statCards = [
  { key: "students", label: "Total Students", icon: GraduationCap },
  { key: "lecturers", label: "Total Lecturers", icon: BookOpen },
  { key: "courses", label: "Total Courses", icon: BookMarked },
  { key: "sessions", label: "Active Sessions", icon: ClipboardCheck },
] as const

export function AdminDashboard() {
  const { setCurrentPage } = useAppStore()
  const { data, isLoading: dashboardLoading } = useDashboardStats()
  
  const stats = data?.stats ?? {}
  const courses = data?.courses ?? []
  const sessions = data?.sessions ?? []
  const recentRecords = data?.recentRecords ?? []
  const allRecords = data?.allRecords ?? []
  const loading = dashboardLoading
  const [seeding, setSeeding] = useState(false)

  const { trendData, departmentData } = useMemo(() => {
    const today = new Date()
    const days: { date: string; label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      days.push({ date: dateStr, label, count: 0 })
    }
    for (const record of allRecords) {
      const recordDate = new Date(record.markedAt).toISOString().split("T")[0]
      const dayEntry = days.find((d) => d.date === recordDate)
      if (dayEntry) dayEntry.count += 1
    }
    const hasData = allRecords.length > 0
    const trendData = hasData
      ? days.map((d) => ({ name: d.label, attendance: d.count }))
      : days.map((d, i) => ({ name: d.label, attendance: [3, 5, 2, 7, 4, 6, 3][i] }))
    const deptMap = new Map<string, { name: string; value: number }>()
    for (const record of allRecords) {
      const deptName = record.student.department?.name || record.session.course.department?.name || "Unknown"
      const existing = deptMap.get(deptName)
      if (existing) existing.value += 1
      else deptMap.set(deptName, { name: deptName, value: 1 })
    }
    const chartColors = ["#0D7C66", "#D4803A", "#2D9F6F", "#5BB89E", "#E8A857"]
    const departmentData = hasData
      ? Array.from(deptMap.values()).map((d, i) => ({ ...d, color: chartColors[i % chartColors.length] }))
      : [{ name: "Computer Science", value: 35, color: "#0D7C66" }, { name: "Mathematics", value: 25, color: "#D4803A" }, { name: "Physics", value: 20, color: "#2D9F6F" }]
    return { trendData, departmentData }
  }, [allRecords])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (res.ok) window.location.reload()
    } catch { /* silent */ } finally { setSeeding(false) }
  }

  return (
    <div className="space-y-6">
      <Card className="border bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 relative rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-teal-50 to-teal-100">
              <Image src="/images/avatar-admin.png" alt="Admin" fill className="object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Full system access — manage students, lecturers, courses, and attendance records</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.key} className="relative overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-6 w-6 text-foreground" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{card.label}</p>
                    {loading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stats[card.key] ?? 0}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Quick Actions</CardTitle><CardDescription>Common tasks and operations</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setCurrentPage("attendance")} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><QrCode className="h-4 w-4" /> New Session</Button>
          <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2">{seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Seed Data</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /><CardTitle className="text-base font-semibold">Attendance Analytics</CardTitle></div></CardHeader>
        <CardContent>
          {loading ? (<div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Last 7 Days Trend</h4>
                <div role="img" aria-label="Line chart showing attendance trend over the last 7 days">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs><linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0D7C66" stopOpacity={0.2} /><stop offset="95%" stopColor="#0D7C66" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="attendance" stroke="#0D7C66" strokeWidth={2} fill="url(#colorAttendance)" name="Attendances" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">By Department</h4>
                <div role="img" aria-label="Pie chart showing attendance distributed by department">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={departmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">{departmentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", fontSize: "12px" }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /><CardTitle className="text-base font-semibold">Recent Activity</CardTitle></div></CardHeader>
          <CardContent>
            {loading ? (<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-5 w-16" /></div>))}</div>) : recentRecords.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No attendance records yet</p></div>) : (
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden"><img src="/images/avatar-student.png" alt={`${record.student.firstName} ${record.student.lastName}`} className="h-full w-full object-cover" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{record.student.firstName} {record.student.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.session.course.code} &middot; {new Date(record.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{record.method === "qr_scan" ? "QR Scan" : "Manual"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><BookMarked className="h-5 w-5" /><CardTitle className="text-base font-semibold">Attendance Overview</CardTitle></div></CardHeader>
          <CardContent>
            {loading ? (<div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-full" /></div>))}</div>) : sessions.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No course data yet</p></div>) : (
              <div className="max-h-64 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {getCourseAttendance(sessions).map((item) => {
                  const maxRecords = Math.max(...getCourseAttendance(sessions).map((c) => c.totalRecords), 1)
                  const percentage = (item.totalRecords / maxRecords) * 100
                  return (
                    <div key={item.courseId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm"><span className="font-medium truncate">{item.courseCode}</span><span className="text-muted-foreground text-xs shrink-0 ml-2">{item.totalRecords} records &middot; {item.sessionCount} session{item.sessionCount !== 1 ? "s" : ""}</span></div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(percentage, 3)}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getCourseAttendance(sessions: AttendanceSession[]) {
  const courseMap = new Map<string, { courseId: string; courseCode: string; totalRecords: number; sessionCount: number }>()
  for (const session of sessions) {
    const courseId = session.course.id
    const existing = courseMap.get(courseId)
    if (existing) {
      existing.totalRecords += session._count.records
      existing.sessionCount += 1
    } else {
      courseMap.set(courseId, { courseId, courseCode: session.course.code, totalRecords: session._count.records, sessionCount: 1 })
    }
  }
  return Array.from(courseMap.values()).sort((a, b) => b.totalRecords - a.totalRecords)
}
