"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Mail,
  Phone,
  GraduationCap,
  KeyRound,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
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

// ── Types ────────────────────────────────────────────────────────
interface Department {
  id: string
  name: string
  code: string
}

interface CourseLecturer {
  id: string
  staffId: string
  firstName: string
  lastName: string
}

interface Course {
  id: string
  code: string
  title: string
  unit: number
  semester: string
  session: string
  departmentId: string
  department: Department
  lecturerId: string | null
  lecturer?: CourseLecturer | null
}

interface Lecturer {
  id: string
  staffId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  departmentId: string
  department: Department
  courses: Course[]
  _count: { courses: number }
}

interface LecturerFormData {
  firstName: string
  lastName: string
  staffId: string
  email: string
  phone: string
  departmentId: string
  courseIds: string[]
}

const emptyForm: LecturerFormData = {
  firstName: "",
  lastName: "",
  staffId: "",
  email: "",
  phone: "",
  departmentId: "",
  courseIds: [],
}

// ── Component ────────────────────────────────────────────────────
export function LecturersPanel() {
  // Data
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LecturerFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Credentials Dialog
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Course filter in dialog
  const [courseDeptFilter, setCourseDeptFilter] = useState<string>("all")
  const [courseSemesterFilter, setCourseSemesterFilter] = useState<string>("all")
  const [courseSearchFilter, setCourseSearchFilter] = useState<string>("")
  const [coursesExpanded, setCoursesExpanded] = useState(true)

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchLecturers = useCallback(async () => {
    try {
      const res = await fetch("/api/lecturers")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLecturers(data)
    } catch {
      toast.error("Failed to load lecturers")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDepartments(data)
    } catch {
      toast.error("Failed to load departments")
    }
  }, [])

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAllCourses(data)
    } catch {
      toast.error("Failed to load courses")
    }
  }, [])

  useEffect(() => {
    fetchLecturers()
    fetchDepartments()
    fetchCourses()
  }, [fetchLecturers, fetchDepartments, fetchCourses])

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = lecturers.filter((l) => {
    const matchesSearch =
      search === "" ||
      `${l.firstName} ${l.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      l.staffId.toLowerCase().includes(search.toLowerCase())

    const matchesDept =
      deptFilter === "all" || l.departmentId === deptFilter

    return matchesSearch && matchesDept
  })

  // ── All courses available for assignment ────────────────────────
  // Admin can see ALL courses and assign/reassign them
  // Apply filters for the dialog
  const filteredAvailableCourses = allCourses.filter((c) => {
    const matchesDept = courseDeptFilter === "all" || c.departmentId === courseDeptFilter
    const matchesSemester = courseSemesterFilter === "all" || c.semester === courseSemesterFilter
    const matchesSearch =
      courseSearchFilter === "" ||
      c.code.toLowerCase().includes(courseSearchFilter.toLowerCase()) ||
      c.title.toLowerCase().includes(courseSearchFilter.toLowerCase())
    return matchesDept && matchesSemester && matchesSearch
  })

  // Get unique semesters for filter
  const semesters = [...new Set(allCourses.map((c) => c.semester))].sort()

  // ── Form helpers ──────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setCourseDeptFilter("all")
    setCourseSemesterFilter("all")
    setCourseSearchFilter("")
    setCoursesExpanded(true)
    setFormOpen(true)
  }

  const openEdit = (l: Lecturer) => {
    setEditingId(l.id)
    setForm({
      firstName: l.firstName,
      lastName: l.lastName,
      staffId: l.staffId,
      email: l.email,
      phone: l.phone ?? "",
      departmentId: l.departmentId,
      courseIds: l.courses?.map((c) => c.id) ?? [],
    })
    setCourseDeptFilter("all")
    setCourseSemesterFilter("all")
    setCourseSearchFilter("")
    setCoursesExpanded(true)
    setFormOpen(true)
  }

  const toggleCourse = (courseId: string) => {
    setForm((prev) => {
      const exists = prev.courseIds.includes(courseId)
      return {
        ...prev,
        courseIds: exists
          ? prev.courseIds.filter((id) => id !== courseId)
          : [...prev.courseIds, courseId],
      }
    })
  }

  const handleSubmit = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.staffId.trim() ||
      !form.email.trim() ||
      !form.departmentId
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        staffId: form.staffId.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        departmentId: form.departmentId,
        courseIds: form.courseIds,
      }

      const url = editingId
        ? `/api/lecturers/${editingId}`
        : "/api/lecturers"
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

      if (!editingId) {
        const data = await res.json()
        toast.success("Lecturer created — login credentials generated!")
        if (data.generatedCredentials) {
          setGeneratedCredentials(data.generatedCredentials)
          setCredentialsOpen(true)
        }
      } else {
        toast.success("Lecturer updated")
      }

      setFormOpen(false)
      fetchLecturers()
      fetchCourses() // Refresh courses to reflect lecturer assignments
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
      const res = await fetch(`/api/lecturers/${deleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Lecturer deleted")
      setDeleteId(null)
      fetchLecturers()
      fetchCourses() // Refresh courses since they become unassigned
    } catch {
      toast.error("Failed to delete lecturer")
    } finally {
      setDeleting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  const initials = (l: Lecturer) =>
    `${l.firstName.charAt(0)}${l.lastName.charAt(0)}`.toUpperCase()

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lecturers</h2>
          <p className="text-muted-foreground text-sm">
            Manage lecturer profiles and course assignments
          </p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" />
          Add Lecturer
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or staff ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <GraduationCap className="h-8 w-8 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No lecturers found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {search || deptFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : 'Click "Add Lecturer" to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lecturer) => (
            <Card
              key={lecturer.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src="/images/avatar-lecturer.png" alt={`${lecturer.firstName} ${lecturer.lastName}`} className="object-cover" />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                      {initials(lecturer)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {lecturer.firstName} {lecturer.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {lecturer.staffId}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 gap-1"
                  >
                    <BookOpen className="h-3 w-3" />
                    {lecturer.courses?.length ?? lecturer._count.courses}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {lecturer.department.name}
                  </Badge>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lecturer.email}</span>
                  </div>

                  {lecturer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{lecturer.phone}</span>
                    </div>
                  )}

                  {/* Assigned Courses */}
                  {lecturer.courses && lecturer.courses.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned Courses</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lecturer.courses.map((course) => (
                          <Badge
                            key={course.id}
                            variant="secondary"
                            className="text-xs gap-1 bg-primary/10 text-primary hover:bg-primary/15"
                          >
                            <BookOpen className="h-2.5 w-2.5" />
                            {course.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1"
                    onClick={() => openEdit(lecturer)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(lecturer.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add / Edit Dialog ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Lecturer" : "Add Lecturer"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update lecturer information and course assignments below."
                : "Fill in the details to add a new lecturer and assign courses."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffId">
                Staff ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staffId"
                value={form.staffId}
                onChange={(e) =>
                  setForm({ ...form, staffId: e.target.value })
                }
                placeholder="STF-001"
                disabled={!!editingId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="john.doe@university.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="+234 800 000 0000"
              />
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

            {/* ── Course Assignment Section ─────────────────────── */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header with toggle */}
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors"
                onClick={() => setCoursesExpanded(!coursesExpanded)}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    Assign Courses
                  </span>
                  {form.courseIds.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary text-xs">
                      {form.courseIds.length} selected
                    </Badge>
                  )}
                </div>
                {coursesExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {coursesExpanded && (
                <div className="p-4 space-y-3">
                  {/* Course filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={courseSearchFilter}
                        onChange={(e) => setCourseSearchFilter(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                    <Select value={courseDeptFilter} onValueChange={setCourseDeptFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depts</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={courseSemesterFilter} onValueChange={setCourseSemesterFilter}>
                      <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
                        <SelectValue placeholder="Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {semesters.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select All / Clear All */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const allIds = filteredAvailableCourses.map((c) => c.id)
                        setForm((prev) => ({
                          ...prev,
                          courseIds: [...new Set([...prev.courseIds, ...allIds])],
                        }))
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const filteredIds = new Set(filteredAvailableCourses.map((c) => c.id))
                        setForm((prev) => ({
                          ...prev,
                          courseIds: prev.courseIds.filter((id) => !filteredIds.has(id)),
                        }))
                      }}
                    >
                      Clear All
                    </Button>
                  </div>

                  {/* Course list with checkboxes */}
                  <ScrollArea className="h-[280px] rounded-md border">
                    {filteredAvailableCourses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No courses found</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Add courses first from the Courses section
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredAvailableCourses.map((course) => {
                          const isSelected = form.courseIds.includes(course.id)
                          const isCurrentlyAssigned = course.lecturerId && course.lecturerId !== editingId
                          const currentLecturerName = course.lecturer
                            ? `${course.lecturer.firstName} ${course.lecturer.lastName}`
                            : null
                          return (
                            <label
                              key={course.id}
                              className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/10 border border-primary/20"
                                  : isCurrentlyAssigned
                                    ? "bg-amber-50 border border-amber-200/60"
                                    : "hover:bg-muted/50 border border-transparent"
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCourse(course.id)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-semibold text-primary">
                                    {course.code}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4"
                                  >
                                    {course.unit} unit{course.unit > 1 ? "s" : ""}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 h-4"
                                  >
                                    {course.semester}
                                  </Badge>
                                  {isCurrentlyAssigned && currentLecturerName && (
                                    <Badge
                                      className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                                      variant="outline"
                                    >
                                      Currently: {currentLecturerName}
                                    </Badge>
                                  )}
                                  {course.lecturerId === editingId && editingId && (
                                    <Badge
                                      className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
                                      variant="outline"
                                    >
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-foreground truncate mt-0.5">
                                  {course.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {course.department.name} • {course.session}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Selected courses summary */}
                  {form.courseIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {form.courseIds.map((cId) => {
                        const course = allCourses.find((c) => c.id === cId)
                        if (!course) return null
                        return (
                          <Badge
                            key={cId}
                            variant="secondary"
                            className="gap-1 bg-primary/10 text-primary text-xs pr-1"
                          >
                            {course.code}
                            <button
                              type="button"
                              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                              onClick={() => toggleCourse(cId)}
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
                  ? "Update Lecturer"
                  : "Create Lecturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────── */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lecturer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lecturer? This action
              cannot be undone. Any courses assigned to this lecturer will
              become unassigned.
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

      {/* ── Credentials Dialog ──────────────────────────────────── */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-foreground" />
              Login Credentials Generated
            </DialogTitle>
            <DialogDescription>
              A login account has been created for this lecturer. Save these credentials — the default password is their staff ID.
            </DialogDescription>
          </DialogHeader>

          {generatedCredentials && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background border px-3 py-2 text-sm font-mono">
                      {generatedCredentials.email}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(generatedCredentials.email, "email")}
                    >
                      {copied === "email" ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Default Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background border px-3 py-2 text-sm font-mono font-bold">
                      {generatedCredentials.password}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(generatedCredentials.password, "password")}
                    >
                      {copied === "password" ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted p-3">
                <p className="text-xs text-foreground">
                  <strong>Important:</strong> Share these credentials with the lecturer securely. They can change their password after logging in from the profile menu.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setCredentialsOpen(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
