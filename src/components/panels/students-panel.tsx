"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  Search,
  QrCode,
  Pencil,
  Trash2,
  GraduationCap,
  Loader2,
  Download,
  Printer,
  X,
  KeyRound,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Department {
  id: string
  name: string
  code: string
}

interface Student {
  id: string
  matricNo: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  level: string
  departmentId: string
  department: { id: string; name: string; code: string }
}

interface StudentFormData {
  firstName: string
  lastName: string
  matricNo: string
  email: string
  phone: string
  departmentId: string
  level: string
}

const emptyForm: StudentFormData = {
  firstName: "",
  lastName: "",
  matricNo: "",
  email: "",
  phone: "",
  departmentId: "",
  level: "",
}

const levels = ["ND1", "ND2", "HND1", "HND2"]

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentsPanel() {
  // Data
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterLevel, setFilterLevel] = useState<string>("all")

  // Add / Edit Dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // QR Code Dialog
  const [qrOpen, setQrOpen] = useState(false)
  const [qrStudent, setQrStudent] = useState<Student | null>(null)

  // Delete Dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Credentials Dialog
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students")
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error("Failed to fetch students:", err)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments")
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchStudents(), fetchDepartments()]).finally(() =>
      setLoading(false)
    )
  }, [fetchStudents, fetchDepartments])

  // ── Filtering ────────────────────────────────────────────────────────

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      s.matricNo.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDept =
      filterDept === "all" || s.departmentId === filterDept

    const matchesLevel =
      filterLevel === "all" || s.level === filterLevel

    return matchesSearch && matchesDept && matchesLevel
  })

  // ── Form handlers ────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEditDialog = (student: Student) => {
    setEditing(student)
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      matricNo: student.matricNo,
      email: student.email,
      phone: student.phone || "",
      departmentId: student.departmentId,
      level: student.level,
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.matricNo.trim() ||
      !form.email.trim() ||
      !form.departmentId ||
      !form.level
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        matricNo: form.matricNo.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        departmentId: form.departmentId,
        level: form.level,
      }

      if (editing) {
        const res = await fetch(`/api/students/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to update student")
        }
        toast.success("Student updated successfully")
      } else {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create student")
        }
        const data = await res.json()
        toast.success("Student added successfully — login credentials generated!")

        // Show generated credentials
        if (data.generatedCredentials) {
          setGeneratedCredentials(data.generatedCredentials)
          setCredentialsOpen(true)
        }
      }

      setFormOpen(false)
      fetchStudents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete handler ──────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/students/${deleting.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete student")
      }
      toast.success("Student deleted successfully")
      setDeleteOpen(false)
      setDeleting(null)
      fetchStudents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── QR Code handler ─────────────────────────────────────────────────

  const openQrDialog = (student: Student) => {
    setQrStudent(student)
    setQrOpen(true)
  }

  const downloadQr = async () => {
    if (!qrStudent) return
    try {
      const res = await fetch(`/api/students/${qrStudent.id}/qr`)
      if (!res.ok) throw new Error("Failed to fetch QR")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${qrStudent.matricNo}_QR_Code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("QR code downloaded successfully!")
    } catch {
      toast.error("Failed to download QR code")
    }
  }

  const printQr = () => {
    if (!qrStudent) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the QR code")
      return
    }
    const studentName = `${qrStudent.firstName} ${qrStudent.lastName}`
    const matricNo = qrStudent.matricNo
    const dept = qrStudent.department?.code || ""
    const level = qrStudent.level || ""
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
            .matric-no { font-size: 14px; color: #0D7C66; font-weight: 600; font-family: monospace; margin-bottom: 4px; }
            .department { font-size: 12px; color: #9ca3af; }
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
              <img src="/api/students/${qrStudent.id}/qr" alt="QR Code" />
            </div>
            <p class="student-name">${studentName}</p>
            <p class="matric-no">${matricNo}</p>
            ${dept ? `<p class="department">${dept}${level ? " • " + level + " Level" : ""}</p>` : ""}
            <p class="footer">Generated on ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight">
            Students
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage student records and generate QR codes
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      {/* ── Search & Filters ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or matric number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-1 sm:flex-none">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-full sm:w-[110px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l} Level
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Student List ────────────────────────────────────────────── */}
      {loading ? (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h4 className="font-semibold text-lg mb-1">No students found</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchQuery || filterDept !== "all" || filterLevel !== "all"
                ? "Try adjusting your search or filters"
                : 'Click "Add Student" to create your first student record'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Matric No</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                              <img src="/images/avatar-student.png" alt={`${student.firstName} ${student.lastName}`} className="h-full w-full object-cover" />
                            </div>
                            <span className="font-medium">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {student.matricNo}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {student.department.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {student.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {student.email}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={() => openQrDialog(student)}
                              title="View QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(student)}
                              title="Edit Student"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setDeleting(student)
                                setDeleteOpen(true)
                              }}
                              title="Delete Student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden max-h-96 overflow-y-auto space-y-3 scrollbar-thin">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                        <img src="/images/avatar-student.png" alt={`${student.firstName} ${student.lastName}`} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">
                            {student.firstName} {student.lastName}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {student.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <code className="rounded bg-muted px-1 py-0.5 font-mono">
                            {student.matricNo}
                          </code>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {student.email}
                        </p>
                        <Badge variant="secondary" className="mt-1.5 text-[10px]">
                          {student.department.code} - {student.department.name}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => openQrDialog(student)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeleting(student)
                          setDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Result count */}
      {!loading && filteredStudents.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredStudents.length} of {students.length} student
          {students.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Add / Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the student's information below."
                : "Fill in the details to register a new student."}
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
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matricNo">
                Matric Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="matricNo"
                placeholder="e.g. CSC/2024/001"
                value={form.matricNo}
                onChange={(e) =>
                  setForm({ ...form, matricNo: e.target.value })
                }
                disabled={!!editing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@university.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) => setForm({ ...form, departmentId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm({ ...form, level: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l} Level
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Update Student" : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code Dialog ─────────────────────────────────────────── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to mark attendance for this student
            </DialogDescription>
          </DialogHeader>

          {qrStudent && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <img
                  src={`/api/students/${qrStudent.id}/qr`}
                  alt={`QR code for ${qrStudent.firstName} ${qrStudent.lastName}`}
                  className="h-48 w-48"
                />
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                    <img src="/images/avatar-student.png" alt={`${qrStudent.firstName} ${qrStudent.lastName}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">
                      {qrStudent.firstName} {qrStudent.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {qrStudent.matricNo}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="mt-2 text-xs"
                >
                  {qrStudent.department.code} &middot; {qrStudent.level} Level
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setQrOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={printQr}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={downloadQr}
              className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleting?.firstName} {deleting?.lastName}
              </span>{" "}
              ({deleting?.matricNo})? This action cannot be undone and will also
              remove all associated attendance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleteSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Credentials Dialog ──────────────────────────────────────── */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-foreground" />
              Login Credentials Generated
            </DialogTitle>
            <DialogDescription>
              A login account has been created for this student. Save these credentials — the default password is their matric number.
            </DialogDescription>
          </DialogHeader>

          {generatedCredentials && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted border px-3 py-2 text-sm font-mono">
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
                    <code className="flex-1 rounded bg-muted border px-3 py-2 text-sm font-mono font-bold">
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
                  <strong>Important:</strong> Share these credentials with the student securely. They can change their password after logging in from the profile menu.
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
