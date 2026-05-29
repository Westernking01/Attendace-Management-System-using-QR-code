"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ScanLine,
  Plus,
  Clock,
  CalendarDays,
  StopCircle,
  QrCode,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  UserPlus,
} from "lucide-react"
import { QrScanner } from "@/components/qr-scanner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Session {
  id: string
  courseId: string
  lecturerId: string
  date: string
  startTime: string
  endTime: string | null
  isActive: boolean
  createdAt: string
  course: {
    id: string
    code: string
    title: string
    department: { id: string; name: string; code: string }
    lecturer: { id: string; firstName: string; lastName: string } | null
  }
  lecturer: {
    id: string
    firstName: string
    lastName: string
    department: { id: string; name: string; code: string }
  }
  _count: { records: number }
  records?: AttendanceRecord[]
}

interface AttendanceRecord {
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
}

interface Course {
  id: string
  code: string
  title: string
  lecturer: { id: string; firstName: string; lastName: string } | null
  _count: { enrollments: number; sessions: number }
}

interface Lecturer {
  id: string
  staffId: string
  firstName: string
  lastName: string
}

interface Student {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  qrCodeData: string
  department: { id: string; name: string; code: string }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendancePanel() {
  const { selectedSessionId, setSelectedSessionId, user } = useAppStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("sessions")

  // New session form
  const [newCourseId, setNewCourseId] = useState("")
  const [newLecturerId, setNewLecturerId] = useState("")
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [creating, setCreating] = useState(false)

  // Scanner dialog
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerSessionId, setScannerSessionId] = useState<string | null>(null)
  const [qrInput, setQrInput] = useState("")
  const [manualStudentId, setManualStudentId] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [marking, setMarking] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    studentName?: string
  } | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // Session detail
  const [detailSession, setDetailSession] = useState<Session | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Manual mark dialog
  const [manualMarkOpen, setManualMarkOpen] = useState(false)
  const [manualMarkSessionId, setManualMarkSessionId] = useState<string | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance")
      if (res.ok) {
        const data = await res.json()
        // Filter sessions for lecturers (only their sessions)
        if (user?.role === "LECTURER" && user.lecturerId) {
          const mySessions = data.filter((s: Session) => s.lecturerId === user.lecturerId)
          setSessions(mySessions)
        } else {
          setSessions(data)
        }
      }
    } catch {
      toast.error("Failed to load sessions")
    }
  }, [user?.role, user?.lecturerId])

  // Fetch courses and lecturers for the form
  useEffect(() => {
    async function fetchForm() {
      try {
        // Build course URL based on role
        let coursesUrl = "/api/courses"
        if (user?.role === "LECTURER" && user.lecturerId) {
          coursesUrl += `?lecturerId=${user.lecturerId}`
        } else if (user?.role === "STUDENT" && user.studentId) {
          coursesUrl += `?studentId=${user.studentId}`
        }

        const [cRes, lRes, sRes] = await Promise.all([
          fetch(coursesUrl),
          fetch("/api/lecturers"),
          fetch("/api/students"),
        ])
        if (cRes.ok) setCourses(await cRes.json())
        if (lRes.ok) setLecturers(await lRes.json())
        if (sRes.ok) setStudents(await sRes.json())
      } catch {
        toast.error("Failed to load form data")
      }
    }
    fetchForm()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchSessions().finally(() => setLoading(false))
  }, [fetchSessions])

  // Auto-set lecturer ID for lecturer role
  useEffect(() => {
    if (user?.role === "LECTURER" && user.lecturerId) {
      setNewLecturerId(user.lecturerId)
    }
  }, [user?.role, user?.lecturerId])

  // If selectedSessionId changes, load detail
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetail(selectedSessionId)
    } else {
      setDetailSession(null)
    }
  }, [selectedSessionId])

  const loadSessionDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/attendance/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailSession(data)
      }
    } catch {
      toast.error("Failed to load session details")
    } finally {
      setDetailLoading(false)
    }
  }

  // Create session
  const handleCreateSession = async () => {
    if (!newCourseId || !newLecturerId) {
      toast.error("Please select a course and lecturer")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: newCourseId,
          lecturerId: newLecturerId,
          date: newDate || undefined,
        }),
      })
      if (res.ok) {
        toast.success("Attendance session created!")
        setNewCourseId("")
        setNewLecturerId("")
        setActiveTab("sessions")
        fetchSessions()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to create session")
      }
    } catch {
      toast.error("Failed to create session")
    } finally {
      setCreating(false)
    }
  }

  // End session
  const handleEndSession = async (id: string) => {
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: false,
          endTime: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success("Session ended")
        fetchSessions()
        if (detailSession?.id === id) loadSessionDetail(id)
        if (scannerSessionId === id) setScannerOpen(false)
      } else {
        toast.error("Failed to end session")
      }
    } catch {
      toast.error("Failed to end session")
    }
  }

  // Mark attendance via QR
  const handleMarkAttendance = async (sessionId: string, body: Record<string, string>) => {
    setMarking(true)
    setScanResult(null)
    try {
      const res = await fetch(`/api/attendance/${sessionId}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok || res.status === 201) {
        setScanResult({
          success: true,
          message: "Attendance marked successfully!",
          studentName: `${data.record?.student?.firstName || ""} ${data.record?.student?.lastName || ""}`.trim(),
        })
        toast.success(`Attendance marked for ${data.record?.student?.firstName} ${data.record?.student?.lastName}`)
        // Refresh session detail
        if (detailSession?.id === sessionId) loadSessionDetail(sessionId)
        // Refresh sessions list
        fetchSessions()
      } else if (res.status === 409) {
        setScanResult({
          success: false,
          message: "Already marked for this session",
          studentName: `${data.student?.firstName || ""} ${data.student?.lastName || ""}`.trim(),
        })
        toast.warning(`Already marked: ${data.student?.firstName} ${data.student?.lastName}`)
      } else {
        setScanResult({
          success: false,
          message: data.error || "Failed to mark attendance",
        })
        toast.error(data.error || "Failed to mark attendance")
      }
    } catch {
      setScanResult({ success: false, message: "Network error" })
      toast.error("Network error")
    } finally {
      setMarking(false)
      setQrInput("")
      setManualStudentId("")
    }
  }

  const openScanner = (sessionId: string) => {
    setScannerSessionId(sessionId)
    setScannerOpen(true)
    setScanResult(null)
    setQrInput("")
    setManualStudentId("")
    setCameraActive(false)
    // Load session details so we can show marked students list
    loadSessionDetail(sessionId)
  }

  const openManualMark = (sessionId: string) => {
    setManualMarkSessionId(sessionId)
    setManualMarkOpen(true)
    setManualStudentId("")
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // ─── Session Detail View ─────────────────────────────────────────────────

  if (selectedSessionId && detailSession) {
    const course = detailSession.course
    const lecturer = detailSession.lecturer
    const records = detailSession.records || []
    const enrolled = courses.find((c) => c.id === course.id)?._count.enrollments || 0

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSessionId(null)}
            className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Back
          </Button>
        </div>

        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 sm:w-64" />
            <Skeleton className="h-4 w-36 sm:w-48" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">
                      {course.code} — {course.title}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {lecturer.firstName} {lecturer.lastName} &middot;{" "}
                      {formatDate(detailSession.date)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatTime(detailSession.startTime)}
                      {detailSession.endTime && ` — ${formatTime(detailSession.endTime)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={detailSession.isActive ? "default" : "secondary"} className={detailSession.isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}>
                      {detailSession.isActive ? "Active" : "Ended"}
                    </Badge>
                    {detailSession.isActive && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleEndSession(detailSession.id)}
                      >
                        <StopCircle className="h-3.5 w-3.5 mr-1" />
                        End
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                    <span className="font-medium">{records.length}</span>
                    <span className="text-muted-foreground">/ {enrolled} students</span>
                  </div>
                  {enrolled > 0 && (
                    <span className="text-foreground font-medium">
                      {Math.round((records.length / enrolled) * 100)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {detailSession.isActive && (
              <Button
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10"
                onClick={() => openManualMark(detailSession.id)}
              >
                <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Mark Attendance Manually
              </Button>
            )}

            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {records.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No students marked yet</p>
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
                            <TableHead>Marked At</TableHead>
                            <TableHead>Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                                    <img src="/images/avatar-student.png" alt={`${record.student.firstName} ${record.student.lastName}`} className="h-full w-full object-cover" />
                                  </div>
                                  <span>{record.student.firstName} {record.student.lastName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {record.student.matricNo}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatTime(record.markedAt)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    record.method === "qr_scan"
                                      ? "border-primary/20 text-foreground"
                                      : "border-border text-muted-foreground"
                                  }
                                >
                                  {record.method === "qr_scan" ? "QR" : "Manual"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden max-h-80 sm:max-h-96 overflow-y-auto space-y-1.5 sm:space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      {records.map((record) => (
                        <div key={record.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full overflow-hidden">
                            <img src="/images/avatar-student.png" alt={`${record.student.firstName} ${record.student.lastName}`} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {record.student.firstName} {record.student.lastName}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] sm:text-[10px]">{record.student.matricNo}</code>
                              {" · "}{formatTime(record.markedAt)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[9px] sm:text-[10px] shrink-0"
                          >
                            {record.method === "qr_scan" ? "QR" : "Manual"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Manual Mark Dialog */}
        <Dialog open={manualMarkOpen} onOpenChange={setManualMarkOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                Mark Attendance Manually
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Select a student to mark their attendance for this session.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs sm:text-sm">Select Student</Label>
                <Select value={manualStudentId} onValueChange={setManualStudentId}>
                  <SelectTrigger className="w-full mt-1.5 text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.matricNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10"
                disabled={!manualStudentId || marking}
                onClick={() => {
                  if (manualMarkSessionId && manualStudentId) {
                    handleMarkAttendance(manualMarkSessionId, {
                      studentId: manualStudentId,
                      method: "manual",
                    })
                    setManualMarkOpen(false)
                  }
                }}
              >
                {marking ? "Marking..." : "Mark Attendance"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ─── Detail Loading ──────────────────────────────────────────────────────

  if (selectedSessionId && detailLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-8 w-20 sm:w-24" />
        <Skeleton className="h-28 sm:h-32 w-full" />
        <Skeleton className="h-9 sm:h-10 w-40 sm:w-48" />
        <Skeleton className="h-56 sm:h-64 w-full" />
      </div>
    )
  }

  // ─── Main Tabs View ──────────────────────────────────────────────────────

  return (
    <div className="space-y-3 sm:space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sessions" className="gap-1 sm:gap-1.5 flex-1 sm:flex-initial text-xs sm:text-sm">
            <ClipboardCheckIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Sessions
          </TabsTrigger>
          {user?.role !== "STUDENT" && (
            <TabsTrigger value="new" className="gap-1 sm:gap-1.5 flex-1 sm:flex-initial text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              New Session
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Sessions Tab ──────────────────────────────────────────────── */}
        <TabsContent value="sessions">
          {loading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                    <Skeleton className="h-5 w-32 sm:w-36" />
                    <Skeleton className="h-4 w-40 sm:w-48" />
                    <Skeleton className="h-4 w-20 sm:w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 sm:w-28" />
                      <Skeleton className="h-8 w-24 sm:w-28" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <ScanLine className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/40" />
                <p className="text-sm sm:text-base text-muted-foreground">No attendance sessions yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Create a new session to get started
                </p>
                <Button
                  className="mt-3 sm:mt-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10"
                  onClick={() => setActiveTab("new")}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  New Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {sessions.map((session) => {
                const course = session.course
                const lecturer = session.lecturer
                const marked = session._count.records
                const enrolled =
                  courses.find((c) => c.id === course.id)?._count.enrollments || 0

                return (
                  <Card
                    key={session.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-xs sm:text-sm truncate">
                            {course.code} — {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lecturer.firstName} {lecturer.lastName}
                          </p>
                        </div>
                        <Badge
                          variant={session.isActive ? "default" : "secondary"}
                          className={`flex-shrink-0 text-[10px] sm:text-xs ${
                            session.isActive
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : ""
                          }`}
                        >
                          {session.isActive ? "Active" : "Ended"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {formatDate(session.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {formatTime(session.startTime)}
                          {session.endTime && ` — ${formatTime(session.endTime)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                        <span className="font-medium">{marked}</span>
                        <span className="text-muted-foreground">/ {enrolled}</span>
                        {enrolled > 0 && (
                          <span className="ml-auto text-foreground font-semibold text-[10px] sm:text-xs">
                            {Math.round((marked / enrolled) * 100)}%
                          </span>
                        )}
                      </div>

                      {session.isActive && (
                        <div
                          className="flex gap-2 pt-0.5 sm:pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 text-[11px] sm:text-xs h-8 sm:h-9"
                            onClick={() => openScanner(session.id)}
                          >
                            <QrCode className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                            Open Scanner
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 text-[11px] sm:text-xs h-8 sm:h-9"
                            onClick={() => handleEndSession(session.id)}
                          >
                            <StopCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                            End
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── New Session Tab ─────────────────────────────────────────── */}
        <TabsContent value="new">
          <Card className="max-w-lg">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-sm sm:text-base">Create Attendance Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div>
                <Label className="text-xs sm:text-sm">Course</Label>
                <Select value={newCourseId} onValueChange={setNewCourseId}>
                  <SelectTrigger className="w-full mt-1.5 text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {user?.role !== "LECTURER" && (
                <div>
                  <Label className="text-xs sm:text-sm">Lecturer</Label>
                  <Select value={newLecturerId} onValueChange={setNewLecturerId}>
                    <SelectTrigger className="w-full mt-1.5 text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Select a lecturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {lecturers.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.firstName} {l.lastName} ({l.staffId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs sm:text-sm">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1.5 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10"
                disabled={creating || !newCourseId || !newLecturerId}
                onClick={handleCreateSession}
              >
                {creating ? (
                  "Creating..."
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Start Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── QR Scanner Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={scannerOpen}
        onOpenChange={(open) => {
          if (!open) setCameraActive(false)
          setScannerOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              QR Attendance Scanner
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Scan a student QR code or manually mark attendance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Real QR Scanner */}
            {scannerSessionId && (
              <QrScanner
                isActive={cameraActive}
                onToggle={() => setCameraActive((prev) => !prev)}
                onScan={(decodedText) => {
                  handleMarkAttendance(scannerSessionId, {
                    qrCodeData: decodedText,
                  })
                }}
              />
            )}

            {/* Scan result feedback */}
            {scanResult && (
              <div
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg ${
                  scanResult.success
                    ? "bg-muted border"
                    : "bg-destructive/10 border border-destructive/20"
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-foreground flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-medium ${scanResult.success ? "text-foreground" : "text-destructive"}`}>
                    {scanResult.message}
                  </p>
                  {scanResult.studentName && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {scanResult.studentName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* QR data input */}
            <div>
              <Label className="text-xs sm:text-sm">Scan / Paste QR Code Data</Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                <Input
                  placeholder="e.g. QR-CSC/21/001-ABC123"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && qrInput && scannerSessionId) {
                      handleMarkAttendance(scannerSessionId, { qrCodeData: qrInput })
                    }
                  }}
                  className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                />
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10 sm:w-auto w-full"
                  disabled={!qrInput || marking || !scannerSessionId}
                  onClick={() => {
                    if (scannerSessionId && qrInput) {
                      handleMarkAttendance(scannerSessionId, {
                        qrCodeData: qrInput,
                      })
                    }
                  }}
                >
                  Scan
                </Button>
              </div>
            </div>

            {/* Manual student selector */}
            <div className="border-t pt-3 sm:pt-4">
              <Label className="text-xs sm:text-sm">Or Select Student Manually</Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                <Select value={manualStudentId} onValueChange={setManualStudentId}>
                  <SelectTrigger className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.matricNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="hover:bg-muted text-xs sm:text-sm h-9 sm:h-10 sm:w-auto w-full"
                  disabled={!manualStudentId || marking || !scannerSessionId}
                  onClick={() => {
                    if (scannerSessionId && manualStudentId) {
                      handleMarkAttendance(scannerSessionId, {
                        studentId: manualStudentId,
                        method: "manual",
                      })
                    }
                  }}
                >
                  Mark
                </Button>
              </div>
            </div>

            {/* Already-marked students list */}
            {scannerSessionId && (() => {
              const session = sessions.find((s) => s.id === scannerSessionId)
              const detailRecords = detailSession?.id === scannerSessionId ? detailSession.records : []
              if (!session || detailRecords.length === 0) return null
              return (
                <div className="border-t pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                    Marked Students ({detailRecords.length})
                  </p>
                  <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1 sm:space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    {detailRecords.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-1 px-2 rounded bg-muted/50"
                      >
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full overflow-hidden shrink-0">
                          <img src="/images/avatar-student.png" alt={`${r.student.firstName} ${r.student.lastName}`} className="h-full w-full object-cover" />
                        </div>
                        <span className="truncate text-[11px] sm:text-xs">
                          {r.student.firstName} {r.student.lastName}
                        </span>
                        <span className="text-muted-foreground text-[10px] sm:text-xs ml-auto flex-shrink-0">
                          {r.student.matricNo}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Helper icon component ────────────────────────────────────────────────────

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}
