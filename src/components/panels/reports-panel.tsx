"use client"

import { useEffect, useState, useMemo } from "react"
import { useCourses, useStudents, useReports } from "@/hooks/use-data"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ClipboardCheck,
  Users,
  TrendingUp,
  Download,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  QrCode,
  UserCircle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportData {
  totalSessions: number
  totalPresent: number
  averageAttendance: number
  records: ReportRecord[]
}

interface ReportRecord {
  id: string
  sessionId: string
  studentId: string
  markedAt: string
  method: string
  student: {
    id: string
    firstName: string
    lastName: string
    matricNo: string
    department: { id: string; name: string; code: string }
  }
  session: {
    id: string
    date: string
    course: {
      id: string
      code: string
      title: string
    }
  }
}

interface Course {
  id: string
  code: string
  title: string
  _count: { enrollments: number; sessions: number }
}

interface Student {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  level: string
  departmentId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsPanel() {
  const { user } = useAppStore()
  // Filters
  const [filterCourseId, setFilterCourseId] = useState<string>("all")
  const [filterStudentId, setFilterStudentId] = useState<string>("all")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  // Course breakdown & pagination state
  const [courseBreakdown, setCourseBreakdown] = useState<{
    courseId: string
    courseCode: string
    courseTitle: string
    sessionCount: number
    avgAttendance: number
  }[]>([])
  const [visibleCount, setVisibleCount] = useState(20)

  // React Query Hooks — must be declared before any useMemo that references them
  const { data: coursesData = [] } = useCourses({
    studentId: user?.role === "STUDENT" ? user.studentId || undefined : undefined,
    lecturerId: user?.role === "LECTURER" ? user.lecturerId || undefined : undefined
  })
  const courses = coursesData as Course[]
  const { data: studentsData = [] } = useStudents()
  const students = studentsData as Student[]

  // Caching levels with useMemo (depends on `students` above)
  const levelOrder: Record<string, number> = { ND1: 1, ND2: 2, HND1: 3, HND2: 4 }
  const availableLevels = useMemo(() =>
    [...new Set(students.map(s => s.level))].sort((a, b) => (levelOrder[a] ?? 99) - (levelOrder[b] ?? 99))
  , [students])

  const filteredStudents = useMemo(() =>
    filterLevel && filterLevel !== "all" ? students.filter(s => s.level === filterLevel) : students
  , [students, filterLevel])

  const reportParams = useMemo(() => {
    const p: any = {}
    if (filterCourseId !== "all") p.courseId = filterCourseId
    if (filterStudentId !== "all") p.studentId = filterStudentId
    if (filterLevel !== "all") p.level = filterLevel
    if (filterDateFrom) p.dateFrom = filterDateFrom
    if (filterDateTo) p.dateTo = filterDateTo
    if (user?.role === "STUDENT" && user.studentId) p.studentId = user.studentId
    return p
  }, [filterCourseId, filterStudentId, filterLevel, filterDateFrom, filterDateTo, user])

  const { data: rawReport, isLoading: reportLoading, isFetching: reportFetching, refetch: fetchReport } = useReports(reportParams)

  // Process report for lecturer role
  const report = useMemo(() => {
    if (!rawReport) return null
    if (user?.role === "LECTURER") {
      const lecturerCourseIds = new Set(courses.map(c => c.id))
      const filteredRecords = rawReport.records.filter((r: ReportRecord) => lecturerCourseIds.has(r.session.course.id))
      const totalSessions = new Set(filteredRecords.map((r: ReportRecord) => r.sessionId)).size
      return {
        ...rawReport,
        records: filteredRecords,
        totalPresent: filteredRecords.length,
        totalSessions,
        averageAttendance: totalSessions > 0 ? Math.round((filteredRecords.length / totalSessions) * 100) / 100 : 0
      }
    }
    return rawReport
  }, [rawReport, user?.role, courses])

  const loading = reportLoading
  const generating = reportFetching

  useEffect(() => {
    if (report?.records) {
      buildCourseBreakdown(report.records)
    }
  }, [report?.records])

  const buildCourseBreakdown = (records: ReportRecord[]) => {
    const courseMap = new Map<
      string,
      {
        code: string
        title: string
        sessions: Set<string>
        totalRecords: number
      }
    >()
    for (const r of records) {
      const cId = r.session.course.id
      if (!courseMap.has(cId)) {
        courseMap.set(cId, {
          code: r.session.course.code,
          title: r.session.course.title,
          sessions: new Set(),
          totalRecords: 0,
        })
      }
      const entry = courseMap.get(cId)!
      entry.sessions.add(r.sessionId)
      entry.totalRecords++
    }

    const breakdown = Array.from(courseMap.entries()).map(
      ([courseId, data]) => {
        const enrolled =
          courses.find((c) => c.id === courseId)?._count.enrollments || 1
        const avg =
          data.sessions.size > 0
            ? Math.round(
                (data.totalRecords / (data.sessions.size * enrolled)) * 100
              )
            : 0
        return {
          courseId,
          courseCode: data.code,
          courseTitle: data.title,
          sessionCount: data.sessions.size,
          avgAttendance: Math.min(avg, 100),
        }
      }
    )
    setCourseBreakdown(breakdown)
  }

  // CSV export
  const handleExportCSV = () => {
    if (!report || report.records.length === 0) {
      toast.error("No data to export")
      return
    }

    const headers = [
      "Student Name",
      "Matric No",
      "Course",
      "Date",
      "Time",
      "Method",
    ]
    const rows = report.records.map((r) => [
      `${r.student.firstName} ${r.student.lastName}`,
      r.student.matricNo,
      `${r.session.course.code} - ${r.session.course.title}`,
      new Date(r.session.date).toLocaleDateString(),
      new Date(r.markedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      r.method === "qr_scan" ? "QR Scan" : "Manual",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("CSV downloaded!")
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <Skeleton className="h-3 w-20 sm:h-4 sm:w-24 mb-2" />
                <Skeleton className="h-6 w-14 sm:h-8 sm:w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 sm:h-64 w-full" />
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
            Filter Report
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className={`grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 ${
            user?.role === "STUDENT" ? "lg:grid-cols-3" : "lg:grid-cols-6"
          }`}>
            {/* Course filter - show for all roles (already filtered by role in API) */}
            <div>
              <Label className="text-[11px] sm:text-xs">Course</Label>
              <Select
                value={filterCourseId}
                onValueChange={setFilterCourseId}
              >
                <SelectTrigger className="w-full mt-1 sm:mt-1.5 h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level filter - only for admin and lecturer */}
            {user?.role !== "STUDENT" && (
              <div>
                <Label className="text-[11px] sm:text-xs">Level</Label>
                <Select
                  value={filterLevel}
                  onValueChange={(val) => {
                    setFilterLevel(val)
                    // Reset student filter when level changes
                    setFilterStudentId("all")
                  }}
                >
                  <SelectTrigger className="w-full mt-1 sm:mt-1.5 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {availableLevels.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l} Level
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Student filter - only for admin and lecturer */}
            {user?.role !== "STUDENT" && (
              <div>
                <Label className="text-[11px] sm:text-xs">Student</Label>
                <Select
                  value={filterStudentId}
                  onValueChange={setFilterStudentId}
                >
                  <SelectTrigger className="w-full mt-1 sm:mt-1.5 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.matricNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-[11px] sm:text-xs">Date From</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="mt-1 sm:mt-1.5 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div>
              <Label className="text-[11px] sm:text-xs">Date To</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="mt-1 sm:mt-1.5 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-end">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => fetchReport()}
                disabled={generating}
              >
                {generating ? (
                  "Generating..."
                ) : (
                  <>
                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
                  {report?.totalSessions ?? 0}
                </p>
              </div>
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Total Attendance</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
                  {report?.totalPresent ?? 0}
                </p>
              </div>
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Avg. Attendance</p>
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
                  {report?.averageAttendance
                    ? `${report.averageAttendance.toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance by Course ──────────────────────────────────────────── */}
      {courseBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
              Attendance by Course
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {courseBreakdown.map((cb) => (
                <div key={cb.courseId} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {cb.courseCode} — {cb.courseTitle}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                      {cb.sessionCount} session{cb.sessionCount !== 1 && "s"} &middot;{" "}
                      <span className="text-foreground font-semibold">
                        {cb.avgAttendance}%
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={cb.avgAttendance}
                    className="h-1.5 sm:h-2 [&>[data-slot=progress-indicator]]:bg-primary"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Detailed Records Table ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <CardTitle className="text-sm sm:text-base">
              Detailed Records
              {report && (
                <span className="text-muted-foreground font-normal ml-1 text-xs sm:text-sm">
                  ({report.records.length})
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!report || report.records.length === 0}
              className="border-primary/30 text-foreground hover:bg-muted text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {!report || report.records.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm sm:text-base">No attendance records found</p>
              <p className="text-xs sm:text-sm mt-1">Adjust your filters and generate a report</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Matric No</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.records.slice(0, visibleCount).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                              <img src="/images/avatar-student.png" alt={`${r.student.firstName} ${r.student.lastName}`} className="h-full w-full object-cover" />
                            </div>
                            <span>{r.student.firstName} {r.student.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.student.matricNo}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.session.course.code}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(r.session.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatTime(r.markedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={r.method === "qr_scan" ? "outline" : "secondary"}
                            className={r.method === "qr_scan" ? "border-primary/20 text-foreground" : ""}
                          >
                            {r.method === "qr_scan" ? "QR" : "Manual"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden max-h-80 sm:max-h-96 overflow-y-auto space-y-1.5 sm:space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {report.records.slice(0, visibleCount).map((r) => (
                  <div key={r.id} className="p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    {/* Student name + method badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden shrink-0">
                          <img src="/images/avatar-student.png" alt={`${r.student.firstName} ${r.student.lastName}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {r.student.firstName} {r.student.lastName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                            {r.student.matricNo}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={r.method === "qr_scan" ? "outline" : "secondary"}
                        className={`text-[9px] sm:text-[10px] shrink-0 ${r.method === "qr_scan" ? "border-primary/20 text-foreground" : ""}`}
                      >
                        {r.method === "qr_scan" ? "QR" : "Manual"}
                      </Badge>
                    </div>

                    {/* Course + date/time info */}
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground pl-10 sm:pl-11">
                      <span className="flex items-center gap-1">
                        <QrCode className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {r.session.course.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatDate(r.session.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {formatTime(r.markedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {visibleCount < report.records.length && (
                <div className="mt-3 sm:mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((v) => v + 20)}
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Load More ({report.records.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
