"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  BookMarked,
  BookOpen,
  UserPlus,
  X,
  GraduationCap,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAppStore, type UserRole } from "@/lib/store"

// ── Types ────────────────────────────────────────────────────────
interface Department {
  id: string
  name: string
  code: string
}

interface Lecturer {
  id: string
  firstName: string
  lastName: string
  staffId: string
}

interface Course {
  id: string
  code: string
  title: string
  unit: number
  semester: string
  session: string
  departmentId: string
  lecturerId: string | null
  department: Department
  lecturer: Lecturer | null
  _count: { enrollments: number; sessions: number }
  enrollments?: { enrolledAt: string }[]
}

interface Enrollment {
  id: string
  studentId: string
  courseId: string
  student: {
    id: string
    matricNo: string
    firstName: string
    lastName: string
    department: Department
  }
}

interface Student {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  email: string
  level: string
  departmentId: string
  department: Department
}

interface CourseFormData {
  code: string
  title: string
  unit: string
  semester: string
  session: string
  departmentId: string
  lecturerId: string
}

const emptyForm: CourseFormData = {
  code: "",
  title: "",
  unit: "",
  semester: "",
  session: "",
  departmentId: "",
  lecturerId: "",
}

// ── Component ────────────────────────────────────────────────────
export function CoursesPanel() {
  const { user } = useAppStore()
  const role: UserRole = user?.role || "STUDENT"

  // Data
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [semesterFilter, setSemesterFilter] = useState("all")

  // Add / Edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CourseFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Enrollment dialog
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  )
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollSubmitting, setEnrollSubmitting] = useState(false)
  const [enrollSearch, setEnrollSearch] = useState("")
  const [enrollLevelFilter, setEnrollLevelFilter] = useState<string>("all")
  const [enrollDeptFilter, setEnrollDeptFilter] = useState<string>("all")
  const [levelEnrollSubmitting, setLevelEnrollSubmitting] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [selectedDept, setSelectedDept] = useState<string>("")

  // View enrollment dialog (for students)
  const [viewEnrollOpen, setViewEnrollOpen] = useState(false)
  const [viewEnrollCourseId, setViewEnrollCourseId] = useState<string | null>(null)
  const [viewEnrollments, setViewEnrollments] = useState<Enrollment[]>([])
  const [viewEnrollLoading, setViewEnrollLoading] = useState(false)

  const isAdmin = role === "ADMIN"
  const isLecturer = role === "LECTURER"
  const isStudent = role === "STUDENT"

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    try {
      let url = "/api/courses"
      // Filter courses based on role
      if (isStudent && user?.studentId) {
        url += `?studentId=${user.studentId}`
      } else if (isLecturer && user?.lecturerId) {
        url += `?lecturerId=${user.lecturerId}`
      }
      // Admin sees all courses (no filter)

      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCourses(data)
    } catch {
      toast.error("Failed to load courses")
    } finally {
      setLoading(false)
    }
  }, [role, user?.studentId, user?.lecturerId])

  const fetchMeta = useCallback(async () => {
    try {
      const [deptRes, lecRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/lecturers"),
      ])
      if (deptRes.ok) setDepartments(await deptRes.json())
      if (lecRes.ok) {
        const lecData = await lecRes.json()
        setLecturers(
          lecData.map((l: Lecturer) => ({
            id: l.id,
            firstName: l.firstName,
            lastName: l.lastName,
            staffId: l.staffId,
          }))
        )
      }
    } catch {
      toast.error("Failed to load metadata")
    }
  }, [])

  useEffect(() => {
    fetchCourses()
    // Only admin needs full metadata for CRUD
    if (isAdmin) fetchMeta()
  }, [fetchCourses, fetchMeta, isAdmin])

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = courses.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())

    const matchesDept =
      deptFilter === "all" || c.departmentId === deptFilter

    const matchesSemester =
      semesterFilter === "all" || c.semester === semesterFilter

    return matchesSearch && matchesDept && matchesSemester
  })

  // ── Form helpers ──────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (c: Course) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      title: c.title,
      unit: String(c.unit),
      semester: c.semester,
      session: c.session,
      departmentId: c.departmentId,
      lecturerId: c.lecturerId ?? "",
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (
      !form.code.trim() ||
      !form.title.trim() ||
      !form.unit.trim() ||
      !form.semester ||
      !form.session.trim() ||
      !form.departmentId
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const body = {
        code: form.code.trim(),
        title: form.title.trim(),
        unit: form.unit.trim(),
        semester: form.semester,
        session: form.session.trim(),
        departmentId: form.departmentId,
        lecturerId:
          form.lecturerId && form.lecturerId !== "none"
            ? form.lecturerId
            : undefined,
      }

      const url = editingId
        ? `/api/courses/${editingId}`
        : "/api/courses"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Operation failed")
      }

      toast.success(editingId ? "Course updated" : "Course created")
      setFormOpen(false)
      fetchCourses()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Operation failed"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/courses/${deleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Course deleted")
      setDeleteId(null)
      fetchCourses()
    } catch {
      toast.error("Failed to delete course")
    } finally {
      setDeleting(false)
    }
  }

  // ── Enrollment helpers (Admin & Lecturer) ────────────────────
  const openEnrollment = async (courseId: string) => {
    setEnrollCourseId(courseId)
    setEnrollSearch("")
    setSelectedStudentIds(new Set())
    setEnrollLevelFilter("all")
    setEnrollDeptFilter("all")
    setSelectedLevel("")
    setSelectedDept("")
    setEnrollLoading(true)
    setEnrollOpen(true)

    try {
      const [courseRes, studentsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch("/api/students"),
      ])

      if (!courseRes.ok || !studentsRes.ok) throw new Error()

      const courseData = await courseRes.json()
      const studentsData = await studentsRes.json()

      setEnrollments(courseData.enrollments ?? [])
      setAllStudents(studentsData)
    } catch {
      toast.error("Failed to load enrollment data")
      setEnrollOpen(false)
    } finally {
      setEnrollLoading(false)
    }
  }

  // View enrollment (Student - read only)
  const openViewEnrollment = async (courseId: string) => {
    setViewEnrollCourseId(courseId)
    setViewEnrollLoading(true)
    setViewEnrollOpen(true)

    try {
      const res = await fetch(`/api/courses/${courseId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setViewEnrollments(data.enrollments ?? [])
    } catch {
      toast.error("Failed to load course details")
      setViewEnrollOpen(false)
    } finally {
      setViewEnrollLoading(false)
    }
  }

  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId))

  // Available students for individual selection
  const availableStudents = allStudents
    .filter((s) => !enrolledStudentIds.has(s.id))
    .filter((s) => {
      if (enrollLevelFilter !== "all" && s.level !== enrollLevelFilter) return false
      if (enrollDeptFilter !== "all" && s.departmentId !== enrollDeptFilter) return false
      if (!enrollSearch) return true
      const q = enrollSearch.toLowerCase()
      return (
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.matricNo.toLowerCase().includes(q)
      )
    })

  // Get unique levels and departments from available (not yet enrolled) students
  const levelOrder: Record<string, number> = { ND1: 1, ND2: 2, HND1: 3, HND2: 4 }
  const availableLevels = [...new Set(
    allStudents
      .filter((s) => !enrolledStudentIds.has(s.id))
      .map((s) => s.level)
  )].sort((a, b) => (levelOrder[a] ?? 99) - (levelOrder[b] ?? 99))

  const availableDepts = [...new Set(
    allStudents
      .filter((s) => !enrolledStudentIds.has(s.id))
      .map((s) => s.departmentId)
  )]

  // Count students by level for the quick-enroll section
  const studentsByLevel = allStudents
    .filter((s) => !enrolledStudentIds.has(s.id))
    .reduce((acc, s) => {
      const key = `${s.level}|${s.departmentId}`
      if (!acc[key]) {
        acc[key] = { level: s.level, departmentId: s.departmentId, departmentName: s.department.name, departmentCode: s.department.code, count: 0, studentIds: [] }
      }
      acc[key].count++
      acc[key].studentIds.push(s.id)
      return acc
    }, {} as Record<string, { level: string; departmentId: string; departmentName: string; departmentCode: string; count: number; studentIds: string[] }>)

  const levelGroups = Object.values(studentsByLevel).sort((a, b) => {
    const levelOrder: Record<string, number> = { ND1: 1, ND2: 2, HND1: 3, HND2: 4 }
    const levelDiff = (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99)
    if (levelDiff !== 0) return levelDiff
    return a.departmentName.localeCompare(b.departmentName)
  })

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEnroll = async (studentIdsToEnroll?: string[]) => {
    const ids = studentIdsToEnroll || Array.from(selectedStudentIds)
    if (!enrollCourseId || ids.length === 0) return
    setEnrollSubmitting(true)
    try {
      const res = await fetch(`/api/courses/${enrollCourseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: ids,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Enrollment failed")
      }

      const result = await res.json()
      const enrolledCount = Array.isArray(result.enrolled) ? result.enrolled.length : (result.enrolled ?? ids.length)
      toast.success(`${enrolledCount} student(s) enrolled successfully`)
      setSelectedStudentIds(new Set())
      // Refresh enrollment data
      openEnrollment(enrollCourseId)
      fetchCourses()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Enrollment failed"
      )
    } finally {
      setEnrollSubmitting(false)
    }
  }

  const handleEnrollByLevel = async () => {
    if (!enrollCourseId || !selectedLevel) return
    setLevelEnrollSubmitting(true)
    try {
      // Find all unenrolled students in the selected level+dept
      const targetStudents = allStudents.filter((s) => {
        if (enrolledStudentIds.has(s.id)) return false
        if (s.level !== selectedLevel) return false
        if (selectedDept && s.departmentId !== selectedDept) return false
        return true
      })

      if (targetStudents.length === 0) {
        toast.info("No unenrolled students found for this selection")
        return
      }

      const studentIds = targetStudents.map((s) => s.id)

      const res = await fetch(`/api/courses/${enrollCourseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Enrollment failed")
      }

      const result = await res.json()
      const enrolledCount = Array.isArray(result.enrolled) ? result.enrolled.length : (result.enrolled ?? studentIds.length)
      toast.success(`${enrolledCount} student(s) from ${selectedLevel} Level enrolled successfully`)
      setSelectedLevel("")
      setSelectedDept("")
      // Refresh enrollment data
      openEnrollment(enrollCourseId)
      fetchCourses()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Enrollment failed"
      )
    } finally {
      setLevelEnrollSubmitting(false)
    }
  }

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Student removed from course")
      // Refresh enrollment data
      if (enrollCourseId) {
        openEnrollment(enrollCourseId)
      }
      fetchCourses()
    } catch {
      toast.error("Failed to remove enrollment")
    }
  }

  // ── Role-based labels ─────────────────────────────────────────
  const pageTitle = isStudent
    ? "My Courses"
    : isLecturer
      ? "My Courses"
      : "Courses"

  const pageDescription = isStudent
    ? "Courses you are enrolled in for the current semester"
    : isLecturer
      ? "Courses assigned to you for the current semester"
      : "Manage courses, assign lecturers, and enroll students"

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {pageDescription}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Add Course
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-xs sm:text-sm"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10 text-xs sm:text-sm">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            <SelectItem value="First">First</SelectItem>
            <SelectItem value="Second">Second</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <BookMarked className="h-7 w-7 sm:h-8 sm:w-8 text-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-1">
            {isStudent ? "No enrolled courses yet" : isLecturer ? "No courses assigned to you" : "No courses found"}
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
            {search || deptFilter !== "all" || semesterFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : isStudent
                ? "You will see courses here once an admin enrolls you"
                : isLecturer
                  ? "You will see courses here once an admin assigns you to a course"
                  : 'Click "Add Course" to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Card
              key={course.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2 sm:mb-3">
                  <Badge className="bg-primary text-primary-foreground font-bold text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
                    {course.code}
                  </Badge>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {course.semester} Semester
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] sm:text-xs"
                    >
                      {course.unit} Unit{course.unit > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-base mb-1 leading-snug">
                  {course.title}
                </h3>

                {/* Session */}
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                  Session: {course.session}
                </p>

                {/* Department & Lecturer */}
                <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs font-normal"
                  >
                    {course.department.name}
                  </Badge>
                  {course.lecturer && (
                    <Badge
                      variant="outline"
                      className="text-[10px] sm:text-xs font-normal gap-1"
                    >
                      <GraduationCap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.lecturer.firstName}{" "}
                      {course.lecturer.lastName}
                    </Badge>
                  )}
                </div>

                {/* Enrollment count */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                  <span>
                    {course._count.enrollments} student
                    {course._count.enrollments !== 1 ? "s" : ""} enrolled
                  </span>
                </div>

                {/* Actions — role-based */}
                <div className="flex items-center gap-2 border-t pt-3 sm:pt-4">
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 flex-1 text-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => openEnrollment(course.id)}
                      >
                        <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Enroll
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => openEdit(course)}
                      >
                        <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => setDeleteId(course.id)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </>
                  )}

                  {isLecturer && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-1 text-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => openEnrollment(course.id)}
                    >
                      <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      View Students
                    </Button>
                  )}

                  {isStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-1 text-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => openViewEnrollment(course.id)}
                    >
                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      View Classmates
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add / Edit Dialog (Admin only) ────────────────────── */}
      {isAdmin && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Course" : "Add Course"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update course information below."
                  : "Fill in the details to create a new course."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="CSC101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">
                    Units <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unit"
                    type="number"
                    min="1"
                    max="10"
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Introduction to Computer Science"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Semester <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.semester}
                    onValueChange={(v) =>
                      setForm({ ...form, semester: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First">First</SelectItem>
                      <SelectItem value="Second">Second</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session">
                    Session <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="session"
                    value={form.session}
                    onChange={(e) =>
                      setForm({ ...form, session: e.target.value })
                    }
                    placeholder="2024/2025"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) =>
                    setForm({ ...form, departmentId: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lecturer (optional)</Label>
                <Select
                  value={form.lecturerId}
                  onValueChange={(v) =>
                    setForm({ ...form, lecturerId: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No lecturer assigned
                    </SelectItem>
                    {lecturers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} ({l.staffId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting
                  ? "Saving…"
                  : editingId
                    ? "Update Course"
                    : "Create Course"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Enrollment Dialog (Admin & Lecturer) ──────────────── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-foreground" />
              {isAdmin ? "Manage Enrollments" : "Enrolled Students"}
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Add or remove students from this course."
                : "Students enrolled in this course."}
            </DialogDescription>
          </DialogHeader>

          {enrollLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Currently enrolled */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-foreground" />
                  Enrolled Students ({enrollments.length})
                </h4>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg bg-muted/30">
                    No students enrolled yet
                  </p>
                ) : (
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    {enrollments.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                            <img src="/images/avatar-student.png" alt={`${e.student.firstName} ${e.student.lastName}`} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {e.student.firstName} {e.student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.student.matricNo} ·{" "}
                              {e.student.department.code}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              handleRemoveEnrollment(e.id)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Enroll by Level (Admin only) */}
              {isAdmin && levelGroups.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary/5 border-b px-4 py-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Quick Enroll by Level
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enroll all students in a level and department at once
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Level group cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {levelGroups.map((group) => (
                        <div
                          key={`${group.level}-${group.departmentId}`}
                          className={`flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                            selectedLevel === group.level && (selectedDept === group.departmentId || (!selectedDept && group.departmentId))
                              ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            if (selectedLevel === group.level && selectedDept === group.departmentId) {
                              setSelectedLevel("")
                              setSelectedDept("")
                            } else {
                              setSelectedLevel(group.level)
                              setSelectedDept(group.departmentId)
                            }
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {group.level} Level
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {group.departmentName}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-primary/10 text-primary"
                          >
                            {group.count} student{group.count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {selectedLevel && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Enroll all {selectedLevel} Level students
                          {selectedDept ? ` in ${departments.find(d => d.id === selectedDept)?.name || "department"}` : ""}
                        </p>
                        <Button
                          onClick={handleEnrollByLevel}
                          disabled={levelEnrollSubmitting}
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                        >
                          {levelEnrollSubmitting ? (
                            "Enrolling…"
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              Enroll All
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Available students to enroll (Admin only) */}
              {isAdmin && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-foreground" />
                    Add Students Individually ({availableStudents.length} available)
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search students…"
                        value={enrollSearch}
                        onChange={(e) => setEnrollSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Select value={enrollLevelFilter} onValueChange={setEnrollLevelFilter}>
                      <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
                        <SelectValue placeholder="Level" />
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
                    <Select value={enrollDeptFilter} onValueChange={setEnrollDeptFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depts</SelectItem>
                        {departments
                          .filter((d) => availableDepts.includes(d.id))
                          .map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select All / Clear All */}
                  {availableStudents.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allIds = availableStudents.map((s) => s.id)
                          setSelectedStudentIds((prev) => {
                            const next = new Set(prev)
                            allIds.forEach((id) => next.add(id))
                            return next
                          })
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedStudentIds(new Set())}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}

                  {availableStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg bg-muted/30">
                      {enrollSearch || enrollLevelFilter !== "all" || enrollDeptFilter !== "all"
                        ? "No students match your filters"
                        : "All students are already enrolled"}
                    </p>
                  ) : (
                    <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      {availableStudents.map((s) => (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                            selectedStudentIds.has(s.id)
                              ? "bg-primary/10 border-primary/20"
                              : "hover:bg-muted/50 border-transparent"
                          }`}
                        >
                          <Checkbox
                            checked={selectedStudentIds.has(s.id)}
                            onCheckedChange={() => toggleStudent(s.id)}
                          />
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                            <img src="/images/avatar-student.png" alt={`${s.firstName} ${s.lastName}`} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.matricNo} · {s.department.code} · {s.level}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {s.level}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedStudentIds.size > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {selectedStudentIds.size} student
                        {selectedStudentIds.size !== 1 ? "s" : ""} selected
                      </p>
                      <Button
                        onClick={() => handleEnroll()}
                        disabled={enrollSubmitting}
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                      >
                        {enrollSubmitting ? (
                          "Enrolling…"
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            Enroll Selected
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Classmates Dialog (Student - read only) ──────── */}
      <Dialog open={viewEnrollOpen} onOpenChange={setViewEnrollOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-foreground" />
              Classmates
            </DialogTitle>
            <DialogDescription>
              Other students enrolled in this course.
            </DialogDescription>
          </DialogHeader>

          {viewEnrollLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No other students enrolled yet
            </p>
          ) : (
            <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              {viewEnrollments.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <img src="/images/avatar-student.png" alt={`${e.student.firstName} ${e.student.lastName}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.student.firstName} {e.student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.student.matricNo} · {e.student.department.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation (Admin only) ──────────────────── */}
      {isAdmin && (
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Course</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this course? This action
                cannot be undone. All enrollment records for this course
                will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
