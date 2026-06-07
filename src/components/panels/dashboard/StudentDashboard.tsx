"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  QrCode,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  BookMarked,
  BarChart3,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Course { id: string; code: string; title: string; _count: { enrollments: number; sessions: number } }
interface ReportRecord { id: string; markedAt: string; method: string; student: { firstName: string; lastName: string; matricNo: string }; session: { course: { code: string; title: string } } }

export function StudentDashboard() {
  const { user, setCurrentPage } = useAppStore()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<ReportRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user?.studentId) return
      try {
        const [qrRes, reportsRes, coursesRes] = await Promise.all([
          fetch(`/api/students/${user.studentId}/qr`),
          fetch(`/api/reports?studentId=${user.studentId}`),
          fetch(`/api/courses?studentId=${user.studentId}`),
        ])
        if (qrRes.ok) setQrCodeUrl(URL.createObjectURL(await qrRes.blob()))
        if (reportsRes.ok) setAttendanceRecords((await reportsRes.json()).records || [])
        if (coursesRes.ok) setCourses(await coursesRes.json())
      } catch (err) {
        console.error("Failed to fetch student data:", err)
      } finally { setLoading(false) }
    }
    fetchData()
  }, [user?.studentId])

  const handleDownloadQR = async () => {
    if (!qrCodeUrl || !user) return
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${user.name?.replace(/\s+/g, "_")}_QR_Code.png`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("QR code downloaded successfully!")
    } catch { toast.error("Failed to download QR code") }
  }

  const handlePrintQR = () => {
    if (!qrCodeUrl || !user) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) { toast.error("Please allow pop-ups to print the QR code"); return }
    const studentName = user.name || "Student"
    printWindow.document.write(`
      <html><head><title>QR Code - ${studentName}</title><style>
      body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
      .card { text-align: center; padding: 32px; border: 2px solid #e5e7eb; border-radius: 16px; max-width: 400px; }
      .logo { width: 48px; height: 48px; margin-bottom: 12px; }
      .qr-container img { width: 220px; height: 220px; }
      </style></head><body><div class="card">
      <img src="/images/school-logo.png" class="logo" /><p>Attendance Management System</p>
      <div class="qr-container"><img src="${qrCodeUrl}" /></div><p>${studentName}</p></div>
      <script>window.onload = function() { window.print(); }</script></body></html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border bg-muted/30">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 relative rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-teal-50 to-teal-100"><Image src="/images/avatar-student.png" alt="Student" fill className="object-cover" /></div>
            <div className="min-w-0"><h2 className="text-base sm:text-xl font-bold truncate">Welcome, {user?.name}</h2><p className="text-xs sm:text-sm text-muted-foreground mt-0.5">View your QR code and track your progress</p></div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 sm:pb-3"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><QrCode className="h-4 w-4" />My QR Code</CardTitle><CardDescription className="text-xs">Show this to the lecturer for attendance</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {loading ? <Skeleton className="h-40 w-40 sm:h-48 sm:w-48 rounded-xl" /> : qrCodeUrl ? (
              <><div className="bg-card p-3 sm:p-4 rounded-xl shadow-sm border w-full max-w-[280px]"><img src={qrCodeUrl} alt="QR Code" className="h-auto w-full aspect-square" /></div><div className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full"><Button variant="outline" className="w-full sm:flex-1 gap-2 text-xs h-9" onClick={handleDownloadQR}><Download className="h-3.5 w-3.5" />Download</Button><Button variant="outline" className="w-full sm:flex-1 gap-2 text-xs h-9" onClick={handlePrintQR}><Printer className="h-3.5 w-3.5" />Print</Button></div></>
            ) : <p className="text-sm text-muted-foreground py-8">QR code not available</p>}
          </CardContent>
        </Card>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2">
            <Card><CardContent className="p-2.5 sm:p-4"><p className="text-[10px] sm:text-xs text-muted-foreground">Classes Attended</p>{loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold">{attendanceRecords.length}</p>}</CardContent></Card>
            <Card><CardContent className="p-2.5 sm:p-4"><p className="text-[10px] sm:text-xs text-muted-foreground">Enrolled Courses</p>{loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-lg sm:text-xl font-bold">{courses.length}</p>}</CardContent></Card>
          </div>
          <Card><CardContent className="p-3 sm:p-4 flex flex-wrap gap-2"><Button onClick={() => setCurrentPage("student-portal")} variant="outline" className="gap-1.5 text-xs h-8"><QrCode className="h-3.5 w-3.5" /> Full QR Code</Button><Button onClick={() => setCurrentPage("reports")} variant="outline" className="gap-1.5 text-xs h-8"><BarChart3 className="h-3.5 w-3.5" /> My Attendance</Button></CardContent></Card>
        </div>
      </div>
    </div>
  )
}
