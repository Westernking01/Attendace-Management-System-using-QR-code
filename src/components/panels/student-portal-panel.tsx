"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Progress } from "@/components/ui/progress"
import {
  QrCode,
  User,
  BookOpen,
  Clock,
  Search,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  email: string
  level: string
  qrCodeData: string
  department: { id: string; name: string; code: string }
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

interface CourseWithDetails {
  id: string
  code: string
  title: string
  unit: number
  semester: string
  session: string
  lecturer: { id: string; firstName: string; lastName: string } | null
  _count: { enrollments: number; sessions: number }
}

interface StudentDetail {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  email: string
  level: string
  department: { id: string; name: string; code: string }
  enrollments: {
    id: string
    courseId: string
    course: {
      id: string
      code: string
      title: string
      unit: number
      semester: string
      session: string
      lecturer: { id: string; firstName: string; lastName: string } | null
    }
  }[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentPortalPanel() {
  const { user } = useAppStore()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [studentsLoading, setStudentsLoading] = useState(true)
  const isStudent = user?.role === "STUDENT"

  // Student detail with enrollments
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // QR code image
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  // Attendance history
  const [attendanceRecords, setAttendanceRecords] = useState<ReportRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // All courses (for session count)
  const [allCourses, setAllCourses] = useState<CourseWithDetails[]>([])

  // Fetch students list
  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students")
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          // Auto-select the logged-in student
          if (isStudent && user?.studentId) {
            setSelectedStudentId(user.studentId)
          }
        }
      } catch {
        toast.error("Failed to load students")
      } finally {
        setStudentsLoading(false)
      }
    }
    fetchStudents()
  }, [isStudent, user?.studentId])

  // Fetch courses (filtered by student enrollment if student role)
  useEffect(() => {
    async function fetchCourses() {
      try {
        const url = isStudent && user?.studentId
          ? `/api/courses?studentId=${user.studentId}`
          : "/api/courses"
        const res = await fetch(url)
        if (res.ok) {
          setAllCourses(await res.json())
        }
      } catch {
        // silent fail
      }
    }
    fetchCourses()
  }, [])

  // When a student is selected, load their details
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null)
      setQrCodeUrl(null)
      setAttendanceRecords([])
      return
    }

    // Load student detail with enrollments
    setDetailLoading(true)
    setQrLoading(true)
    setHistoryLoading(true)

    async function fetchStudentDetail() {
      try {
        const res = await fetch(`/api/students/${selectedStudentId}`)
        if (res.ok) {
          setStudentDetail(await res.json())
        }
      } catch {
        toast.error("Failed to load student details")
      } finally {
        setDetailLoading(false)
      }
    }

    async function fetchQrCode() {
      try {
        // Fetch as blob and create object URL
        const res = await fetch(`/api/students/${selectedStudentId}/qr`)
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          setQrCodeUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
      } catch {
        toast.error("Failed to load QR code")
      } finally {
        setQrLoading(false)
      }
    }

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/reports?studentId=${selectedStudentId}`)
        if (res.ok) {
          const data = await res.json()
          setAttendanceRecords(data.records || [])
        }
      } catch {
        toast.error("Failed to load attendance history")
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchStudentDetail()
    fetchQrCode()
    fetchHistory()

    // Cleanup object URL on unmount or change
    return () => {
      setQrCodeUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [selectedStudentId])

  // Filter students by search
  const filteredStudents = searchQuery
    ? students.filter(
        (s) =>
          s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.matricNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students

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

  // Calculate attendance per course
  const courseAttendanceMap = new Map<
    string,
    { attended: number; totalSessions: number }
  >()

  // Initialize from enrolled courses
  if (studentDetail) {
    for (const enrollment of studentDetail.enrollments) {
      const course = allCourses.find((c) => c.id === enrollment.courseId)
      courseAttendanceMap.set(enrollment.courseId, {
        attended: 0,
        totalSessions: course?._count.sessions || 0,
      })
    }
  }

  // Count attended sessions per course
  for (const record of attendanceRecords) {
    const cId = record.session.course.id
    const existing = courseAttendanceMap.get(cId)
    if (existing) {
      existing.attended++
    } else {
      const course = allCourses.find((c) => c.id === cId)
      courseAttendanceMap.set(cId, {
        attended: 1,
        totalSessions: course?._count.sessions || 1,
      })
    }
  }

  // ─── QR Download & Print Handlers ────────────────────────────────────────

  const handleDownloadQR = async () => {
    if (!qrCodeUrl || !selectedStudent) return

    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedStudent.matricNo}_QR_Code.png`
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
    if (!qrCodeUrl || !selectedStudent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the QR code")
      return
    }

    const studentName = `${selectedStudent.firstName} ${selectedStudent.lastName}`
    const matricNo = selectedStudent.matricNo
    const dept = selectedStudent.department?.code || ""

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
            .logo {
              width: 48px;
              height: 48px;
              margin: 0 auto 12px;
            }
            .institution {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .system-name {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 20px;
            }
            .qr-container {
              display: inline-block;
              padding: 16px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              margin-bottom: 16px;
            }
            .qr-container img {
              width: 220px;
              height: 220px;
            }
            .student-name {
              font-size: 16px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 2px;
            }
            .matric-no {
              font-size: 14px;
              color: #0D7C66;
              font-weight: 600;
              font-family: monospace;
              margin-bottom: 4px;
            }
            .department {
              font-size: 12px;
              color: #9ca3af;
            }
            .footer {
              margin-top: 16px;
              font-size: 10px;
              color: #d1d5db;
            }
            @media print {
              body { background: #fff; }
              .card { border: 1px solid #e5e7eb; }
            }
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
            <p class="matric-no">${matricNo}</p>
            ${dept ? `<p class="department">${dept}</p>` : ""}
            <p class="footer">Generated on ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // ─── No student selected (only for admin) ──────────────────────────────

  if (!selectedStudentId) {
    // Student users should be auto-selected, show loading
    if (isStudent) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground text-sm">Loading your profile...</div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-foreground" />
              Select Student Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or matric number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a student profile..." />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.matricNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {studentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted hover:border-border transition-colors text-left"
                    onClick={() => setSelectedStudentId(s.id)}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                      <img src="/images/avatar-student.png" alt={`${s.firstName} ${s.lastName}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.matricNo} &middot; {s.department.code}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Student selected ──────────────────────────────────────────────────

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with back button (only for admin viewing other students) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {!isStudent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStudentId("")
              setStudentDetail(null)
              setQrCodeUrl(null)
              setAttendanceRecords([])
            }}
            className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
          >
            ← All Students
          </Button>
        )}
        {selectedStudent && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden shrink-0">
              <img src="/images/avatar-student.png" alt={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "Student"} className="h-full w-full object-cover" />
            </div>
            <span className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
              {selectedStudent.firstName} {selectedStudent.lastName}
            </span>
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {selectedStudent.matricNo}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* ── QR Code Card ───────────────────────────────────────────────── */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-foreground" />
              My QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {qrLoading ? (
              <div className="flex flex-col items-center py-6">
                <Skeleton className="h-40 w-40 sm:h-48 sm:w-48 rounded-xl" />
                <Skeleton className="h-4 w-32 mt-3" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            ) : qrCodeUrl ? (
              <>
                <div className="bg-card p-3 sm:p-4 rounded-xl shadow-sm border w-full max-w-[280px]" id="qr-code-display">
                  <img
                    id="student-qr-image"
                    src={qrCodeUrl}
                    alt={`QR Code for ${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
                    className="h-auto w-full aspect-square"
                  />
                </div>
                <p className="font-semibold mt-3 text-sm sm:text-base text-center">
                  {selectedStudent?.firstName} {selectedStudent?.lastName}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedStudent?.matricNo}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 text-center px-2">
                  Show this QR code to the lecturer for attendance scanning
                </p>

                {/* Download & Print Buttons */}
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

        {/* ── My Courses ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-foreground" />
              My Courses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {detailLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : studentDetail && studentDetail.enrollments.length > 0 ? (
              <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 sm:space-y-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {studentDetail.enrollments.map((enrollment) => {
                  const course = enrollment.course
                  const stats = courseAttendanceMap.get(course.id)
                  const pct =
                    stats && stats.totalSessions > 0
                      ? Math.round((stats.attended / stats.totalSessions) * 100)
                      : 0

                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted text-foreground font-bold text-[10px] sm:text-xs flex-shrink-0">
                        {course.code.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {course.code} — {course.title}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {course.lecturer
                            ? `${course.lecturer.firstName} ${course.lecturer.lastName}`
                            : "No lecturer assigned"}
                          {" "}&middot; {course.semester} Semester
                        </p>
                      </div>
                      {stats && stats.totalSessions > 0 && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] sm:text-xs font-semibold text-foreground">
                            {pct}%
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {stats.attended}/{stats.totalSessions}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Not enrolled in any courses</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance Summary ────────────────────────────────────────────── */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-foreground">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Classes Attended</p>
                <p className="text-xl font-bold mt-0.5">{attendanceRecords.length}</p>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <CheckCircle2 className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-foreground/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="text-xl font-bold mt-0.5">
                  {Array.from(courseAttendanceMap.values()).reduce(
                    (sum, s) => sum + s.totalSessions,
                    0
                  )}
                </p>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-foreground/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall Rate</p>
                <p className="text-xl font-bold mt-0.5">
                  {(() => {
                    const totalSessions = Array.from(
                      courseAttendanceMap.values()
                    ).reduce((sum, s) => sum + s.totalSessions, 0)
                    const totalAttended = attendanceRecords.length
                    return totalSessions > 0
                      ? `${Math.round((totalAttended / totalSessions) * 100)}%`
                      : "0%"
                  })()}
                </p>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance by Course (Progress Bars) ──────────────────────────── */}
      {courseAttendanceMap.size > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-foreground" />
              Attendance by Course
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              {Array.from(courseAttendanceMap.entries()).map(
                ([courseId, stats]) => {
                  const course = allCourses.find((c) => c.id === courseId)
                  const pct =
                    stats.totalSessions > 0
                      ? Math.round(
                          (stats.attended / stats.totalSessions) * 100
                        )
                      : 0

                  return (
                    <div key={courseId} className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0 text-xs sm:text-sm">
                        <span className="font-medium truncate">
                          {course?.code || "Unknown"} —{" "}
                          {course?.title || "Unknown Course"}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0 text-[10px] sm:text-xs">
                          {stats.attended}/{stats.totalSessions} &middot;{" "}
                          <span className="font-semibold text-foreground">
                            {pct}%
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-2 [&>[data-slot=progress-indicator]]:bg-primary"
                      />
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Attendance History ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-foreground" />
            My Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No attendance records yet</p>
              <p className="text-sm mt-1">
                Your attendance will appear here after you check in to a session
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">
                          {r.session.course.code}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(r.session.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatTime(r.markedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {r.method === "qr_scan" ? "QR Scan" : "Manual"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden max-h-80 sm:max-h-96 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {attendanceRecords.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground font-bold text-[10px] sm:text-xs">
                      {r.session.course.code.slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {r.session.course.code} — {r.session.course.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDate(r.session.date)} · {formatTime(r.markedAt)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[9px] sm:text-[10px] shrink-0"
                    >
                      {r.method === "qr_scan" ? "QR" : "Manual"}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
