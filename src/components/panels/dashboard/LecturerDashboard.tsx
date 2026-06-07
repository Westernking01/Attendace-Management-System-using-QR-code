"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  BookMarked,
  ClipboardCheck,
  QrCode,
  Users,
  BarChart3,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Course { id: string; code: string; title: string; _count: { enrollments: number; sessions: number } }
interface AttendanceSession { id: string; lecturerId: string; isActive: boolean; _count: { records: number }; course: { id: string; code: string; title: string } }

export function LecturerDashboard() {
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
        const coursesData: Course[] = await coursesRes.json()
        const attendanceData: AttendanceSession[] = await attendanceRes.json()
        const mySessions = user?.lecturerId ? attendanceData.filter((s: AttendanceSession) => s.lecturerId === user.lecturerId) : attendanceData
        setCourses(coursesData)
        setSessions(mySessions)
      } catch (err) {
        console.error("Failed to fetch lecturer data:", err)
      } finally { setLoading(false) }
    }
    fetchData()
  }, [user?.lecturerId])

  const activeSessions = sessions.filter((s) => s.isActive).length
  const totalRecords = sessions.reduce((sum, s) => sum + s._count.records, 0)

  return (
    <div className="space-y-6">
      <Card className="border bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 relative rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gradient-to-br from-amber-50 to-amber-100">
              <Image src="/images/avatar-lecturer.png" alt="Lecturer" fill className="object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome, {user?.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your courses and take attendance with QR code scanning</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><BookMarked className="h-6 w-6 text-foreground" /></div><div><p className="text-sm font-medium text-muted-foreground">My Courses</p>{loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{courses.length}</p>}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><ClipboardCheck className="h-6 w-6 text-foreground" /></div><div><p className="text-sm font-medium text-muted-foreground">Active Sessions</p>{loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{activeSessions}</p>}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><Users className="h-6 w-6 text-foreground" /></div><div><p className="text-sm font-medium text-muted-foreground">Total Scans</p>{loading ? <Skeleton className="h-8 w-12 mt-1" /> : <p className="text-2xl font-bold">{totalRecords}</p>}</div></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setCurrentPage("attendance")} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><QrCode className="h-4 w-4" /> Start Attendance Session</Button>
          <Button variant="outline" onClick={() => setCurrentPage("courses")} className="gap-2"><BookMarked className="h-4 w-4" /> View My Courses</Button>
          <Button variant="outline" onClick={() => setCurrentPage("reports")} className="gap-2"><BarChart3 className="h-4 w-4" /> View Reports</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Recent Sessions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>) : sessions.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No sessions yet</p></div>) : (<div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">{sessions.slice(0, 5).map((session) => (<div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><ClipboardCheck className="h-5 w-5 text-foreground" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{session.course.code} — {session.course.title}</p><p className="text-xs text-muted-foreground">{session._count.records} student{session._count.records !== 1 ? "s" : ""} checked in</p></div><Badge variant={session.isActive ? "default" : "secondary"}>{session.isActive ? "Active" : "Ended"}</Badge></div>))}</div>)}
        </CardContent>
      </Card>
    </div>
  )
}
