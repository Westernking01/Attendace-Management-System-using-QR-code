"use client"

import dynamic from "next/dynamic"
import { useAppStore } from "@/lib/store"
import { Loader2 } from "lucide-react"

// Dynamic imports for role-specific dashboards
const AdminDashboard = dynamic(() => import("./dashboard/AdminDashboard").then(mod => mod.AdminDashboard), { 
  loading: () => <DashboardLoader /> 
})
const LecturerDashboard = dynamic(() => import("./dashboard/LecturerDashboard").then(mod => mod.LecturerDashboard), { 
  loading: () => <DashboardLoader /> 
})
const StudentDashboard = dynamic(() => import("./dashboard/StudentDashboard").then(mod => mod.StudentDashboard), { 
  loading: () => <DashboardLoader /> 
})

function DashboardLoader() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard data...</p>
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
