"use client"

import { useEffect, useMemo, useState } from "react"
import {
  GraduationCap,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  QrCode,
  Loader2,
  Users,
  TrendingUp,
  BarChart3,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Printer,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student { id: string; matricNo: string; firstName: string; lastName: string }
interface Lecturer { id: string }
interface Course { id: string; code: string; title: string; _count: { enrollments: number; sessions: number } }
interface AttendanceSession { id: string; isActive: boolean; _count: { records: number }; course: { code: string; title: string } }
interface ReportRecord {
  id: string
  markedAt: string
  method: string
  student: { firstName: string; lastName: string; matricNo: string; department?: { name: string; code: string } }
  session: { course: { code: string; title: string; department?: { name: string; code: string } } }
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

const statCards = [
  {
    key: "students",
    label: "Total Students",
    icon: GraduationCap,
  },
  {
    key: "lecturers",
    label: "Total Lecturers",
    icon: BookOpen,
  },
  {
    key: "courses",
    label: "Total Courses",
    icon: BookMarked,
  },
  {
    key: "sessions",
    label: "Active Sessions",
    icon: ClipboardCheck,
  },
] as const

function AdminDashboard() {
  const { setCurrentPage } = useAppStore()

  const [stats, setStats] = useState<Record<string, number>>({})
  const [recentRecords, setRecentRecords] = useState<ReportRecord[]>([])
  const [allRecords, setAllRecords] = useState<ReportRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [studentsRes, lecturersRes, coursesRes, attendanceRes, reportsRes] =
          await Promise.all([
            fetch("/api/students"),
            fetch("/api/lecturers"),
            fetch("/api/courses"),
            fetch("/api/attendance"),
            fetch("/api/reports"),
          ])

        const studentsRaw = await studentsRes.json()
const lecturersRaw = await lecturersRes.json()
const coursesRaw = await coursesRes.json()
const attendanceRaw = await attendanceRes.json()
const reportsData = await reportsRes.json()

// Safely handle API responses - ensure arrays even if API returns errors
const students: Student[] = Array.isArray(studentsRaw) ? studentsRaw : []
const lecturers: Lecturer[] = Array.isArray(lecturersRaw) ? lecturersRaw : []
const coursesData: Course[] = Array.isArray(coursesRaw) ? coursesRaw : []
const attendanceData: AttendanceSession[] = Array.isArray(attendanceRaw) ? attendanceRaw : []

const activeSessions = attendanceData.filter((s) => s.isActive).length

        setStats({
          students: students.length,
          lecturers: lecturers.length,
          courses: coursesData.length,
          sessions: activeSessions,
        })
        setCourses(coursesData)
        setSessions(attendanceData)
        const reportRecords: ReportRecord[] = Array.isArray(reportsData?.records) ? reportsData.records : []
        setRecentRecords(reportRecords.slice(0, 5))
        setAllRecords(reportRecords)
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

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
      : [
          { name: "Computer Science", value: 35, color: "#0D7C66" },
          { name: "Mathematics", value: 25, color: "#D4803A" },
          { name: "Physics", value: 20, color: "#2D9F6F" },
        ]

    return { trendData, departmentData }
  }, [allRecords])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (res.ok) window.location.reload()
    } catch { /* silent */ } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-teal-50 to-teal-100">
              <img src="/images/avatar-admin.png" alt="Admin" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Full system access — manage students, lecturers, courses, and attendance records
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.key} className="relative overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{card.label}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stats[card.key] ?? 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setCurrentPage("attendance")} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <QrCode className="h-4 w-4" /> New Session
          </Button>
          <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Seed Data
          </Button>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">Attendance Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Last 7 Days Trend</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D7C66" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0D7C66" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="attendance" stroke="#0D7C66" strokeWidth={2} fill="url(#colorAttendance)" name="Attendances" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">By Department</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={departmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", fontSize: "12px" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No attendance records yet</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden">
                      <img src="/images/avatar-student.png" alt={`${record.student.firstName} ${record.student.lastName}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{record.student.firstName} {record.student.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {record.session.course.code} &middot; {new Date(record.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {record.method === "qr_scan" ? "QR Scan" : "Manual"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">Attendance Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-full" /></div>))}</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No course data yet</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {getCourseAttendance(sessions).map((item) => {
                  const maxRecords = Math.max(...getCourseAttendance(sessions).map((c) => c.totalRecords), 1)
                  const percentage = (item.totalRecords / maxRecords) * 100
                  return (
                    <div key={item.courseId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{item.courseCode}</span>
                        <span className="text-muted-foreground text-xs shrink-0 ml-2">{item.totalRecords} records &middot; {item.sessionCount} session{item.sessionCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(percentage, 3)}%` }} />
                      </div>
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

// ─── Lecturer Dashboard ──────────────────────────────────────────────────────

function LecturerDashboard() {
  const { user, setCurrentPage } = useAppStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const lecturerParam = user?.lecturerId ? `?lecturerId=${user.lecturerId}` : ""
        const [coursesRes, attendanceRes] = await Promise.all([
          fetch(`/api/courses${lecturerParam}`),
          fetch("/api/attendance"),
        ])
        const coursesRaw = await coursesRes.json()
const attendanceRaw = await attendanceRes.json()

// Safely handle API responses - ensure arrays even if API returns errors
const coursesData: Course[] = Array.isArray(coursesRaw) ? coursesRaw : []
const attendanceData: AttendanceSession[] = Array.isArray(attendanceRaw) ? attendanceRaw : []

        // Filter sessions to only show this lecturer's sessions
        const mySessions = user?.lecturerId
          ? attendanceData.filter((s: AttendanceSession) => s.lecturerId === user.lecturerId)
          : attendanceData

        setCourses(coursesData)
        setSessions(mySessions)
      } catch (err) {
        console.error("Failed to fetch lecturer data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.lecturerId])

  const activeSessions = sessions.filter((s) => s.isActive).length
  const totalRecords = sessions.reduce((sum, s) => sum + s._count.records, 0)

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-amber-50 to-amber-100">
              <img src="/images/avatar-lecturer.png" alt="Lecturer" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome, {user?.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your courses and take attendance with QR code scanning
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <BookMarked className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Courses</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{courses.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <ClipboardCheck className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{activeSessions}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{totalRecords}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setCurrentPage("attendance")} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <QrCode className="h-4 w-4" /> Start Attendance Session
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage("courses")} className="gap-2">
            <BookMarked className="h-4 w-4" /> View My Courses
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage("reports")} className="gap-2">
            <BarChart3 className="h-4 w-4" /> View Reports
          </Button>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No sessions yet</p>
              <p className="text-xs mt-1">Start a session to begin tracking attendance</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <ClipboardCheck className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.course.code} — {session.course.title}</p>
                    <p className="text-xs text-muted-foreground">{session._count.records} student{session._count.records !== 1 ? "s" : ""} checked in</p>
                  </div>
                  <Badge variant={session.isActive ? "default" : "secondary"}>
                    {session.isActive ? "Active" : "Ended"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Student Dashboard ───────────────────────────────────────────────────────

function StudentDashboard() {
  const { user, setCurrentPage } = useAppStore()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<ReportRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user?.studentId) return
      try {
        // Fetch QR code
        const qrRes = await fetch(`/api/students/${user.studentId}/qr`)
        if (qrRes.ok) {
          const blob = await qrRes.blob()
          const url = URL.createObjectURL(blob)
          setQrCodeUrl(url)
        }

        // Fetch attendance records
        const reportsRes = await fetch(`/api/reports?studentId=${user.studentId}`)
        if (reportsRes.ok) {
          const data = await reportsRes.json()
          setAttendanceRecords(data.records || [])
        }

        // Fetch courses (only the student's enrolled courses)
        const coursesRes = await fetch(`/api/courses?studentId=${user.studentId}`)
        if (coursesRes.ok) setCourses(await coursesRes.json())
      } catch (err) {
        console.error("Failed to fetch student data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    return () => {
      setQrCodeUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [user?.studentId])

  const attendedCount = attendanceRecords.length
  const qrScans = attendanceRecords.filter((r) => r.method === "qr_scan").length
  const manualCount = attendanceRecords.filter((r) => r.method === "manual").length

  const handleDownloadQR = async () => {
    if (!qrCodeUrl || !user) return
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${user.name?.replace(/\s+/g, "_")}_QR_Code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("QR code downloaded successfully!")
    } catch {
      toast.error("Failed to download QR code")
    }
  }

  const handlePrintQR = () => {
    if (!qrCodeUrl || !user) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the QR code")
      return
    }
    const studentName = user.name || "Student"
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #fff;
            }
            .card {
              text-align: center;
              padding: 32px 40px;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              max-width: 400px;
            }
            .logo { width: 48px; height: 48px; margin: 0 auto 12px; }
            .institution { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
            .system-name { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; }
            .qr-container { display: inline-block; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px; }
            .qr-container img { width: 220px; height: 220px; }
            .student-name { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 2px; }
            .matric-no { font-size: 14px; color: #0D7C66; font-weight: 600; font-family: monospace; }
            .footer { margin-top: 16px; font-size: 10px; color: #d1d5db; }
            @media print { body { background: #fff; } .card { border: 1px solid #e5e7eb; } }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="/images/fpa-logo.png" alt="FPA Logo" class="logo" />
            <p class="institution">Federal Polytechnic, Ado Ekiti</p>
            <p class="system-name">AttendQ — Student QR Code</p>
            <div class="qr-container">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            <p class="student-name">${studentName}</p>
            <p class="footer">Generated on ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome banner */}
      <Card className="border bg-muted/30">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-teal-50 to-teal-100">
              <img src="/images/avatar-student.png" alt="Student" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold truncate">Welcome, {user?.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                View your QR code, check attendance history, and track your progress
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code + Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* QR Code */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              My QR Code
            </CardTitle>
            <CardDescription className="text-xs">Show this to the lecturer for attendance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {loading ? (
              <div className="flex flex-col items-center py-6">
                <Skeleton className="h-40 w-40 sm:h-48 sm:w-48 rounded-xl" />
              </div>
            ) : qrCodeUrl ? (
              <>
                <div className="bg-card p-3 sm:p-4 rounded-xl shadow-sm border w-full max-w-[280px]">
                  <img src={qrCodeUrl} alt="My QR Code" className="h-auto w-full aspect-square" />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full">
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 gap-2 text-xs sm:text-sm h-9 sm:h-10"
                    onClick={handleDownloadQR}
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 gap-2 text-xs sm:text-sm h-9 sm:h-10"
                    onClick={handlePrintQR}
                  >
                    <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Print
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mb-2 opacity-40" />
                <p className="text-sm">QR code not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-3 sm:space-y-4">
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2">
            <Card>
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Classes Attended</p>
                    {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold mt-0.5">{attendedCount}</p>}
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">QR Scans</p>
                    {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold mt-0.5">{qrScans}</p>}
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <QrCode className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Manual Check-ins</p>
                    {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold mt-0.5">{manualCount}</p>}
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Enrolled Courses</p>
                    {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold mt-0.5">{courses.length}</p>}
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <BookMarked className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick links */}
          <Card>
            <CardContent className="p-3 sm:p-4 flex flex-wrap gap-2">
              <Button onClick={() => setCurrentPage("student-portal")} variant="outline" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Full QR Code
              </Button>
              <Button onClick={() => setCurrentPage("reports")} variant="outline" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> My Attendance
              </Button>
              <Button onClick={() => setCurrentPage("courses")} variant="outline" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <BookMarked className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> My Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <XCircle className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No attendance records yet</p>
              <p className="text-xs sm:text-sm mt-1">Your attendance will appear here after you check in</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5 sm:space-y-2 scrollbar-thin">
              {attendanceRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden shrink-0">
                    <img src="/images/avatar-student.png" alt="Student" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{record.session.course.code} — {record.session.course.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(record.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                    {record.method === "qr_scan" ? "QR Scan" : "Manual"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardPanel() {
  const { user } = useAppStore()
  const role = user?.role || "STUDENT"

  switch (role) {
    case "ADMIN":
      return <AdminDashboard />
    case "LECTURER":
      return <LecturerDashboard />
    case "STUDENT":
      return <StudentDashboard />
    default:
      return <StudentDashboard />
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CourseAttendance {
  courseId: string
  courseCode: string
  courseTitle: string
  totalRecords: number
  sessionCount: number
}

function getCourseAttendance(sessions: AttendanceSession[]): CourseAttendance[] {
  const map = new Map<string, CourseAttendance>()
  for (const session of sessions) {
    const existing = map.get(session.course.code)
    if (existing) {
      existing.totalRecords += session._count.records
      existing.sessionCount += 1
    } else {
      map.set(session.course.code, {
        courseId: session.id,
        courseCode: session.course.code,
        courseTitle: session.course.title,
        totalRecords: session._count.records,
        sessionCount: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalRecords - a.totalRecords)
}
