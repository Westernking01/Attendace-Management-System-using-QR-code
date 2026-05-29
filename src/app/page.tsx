"use client"

import { useEffect, useState } from "react"
import { useAppStore, type Page } from "@/lib/store"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { LoginPage } from "@/components/login-page"
import { AnimatePresence, motion } from "framer-motion"
import { DashboardPanel } from "@/components/panels/dashboard-panel"
import { StudentsPanel } from "@/components/panels/students-panel"
import { AttendancePanel } from "@/components/panels/attendance-panel"
import { ReportsPanel } from "@/components/panels/reports-panel"
import { StudentPortalPanel } from "@/components/panels/student-portal-panel"
import { LecturersPanel } from "@/components/panels/lecturers-panel"
import { CoursesPanel } from "@/components/panels/courses-panel"
import { Shield, Zap, Loader2 } from "lucide-react"

export default function Home() {
  const { currentPage, isAuthenticated, user, setUser } = useAppStore()
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session-info")
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
        }
      } catch {
        // Session check failed, user stays unauthenticated
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [setUser])

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/images/fpa-logo.png"
            alt="FPA Logo"
            className="h-16 w-16 object-contain animate-pulse"
          />
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Loading session...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  // Show main app if authenticated
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderPage(currentPage, user.role)}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="mt-auto border-t border-border/50 bg-card px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/images/fpa-logo.png"
                alt="FPA"
                className="h-6 w-6 rounded object-contain"
              />
              <span className="text-sm font-semibold text-primary">AttendQ</span>
              <span className="text-xs text-muted-foreground">© 2026</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-primary/60">
                <Shield className="h-3 w-3" />
                Secure
              </span>
              <span className="flex items-center gap-1 text-accent-foreground/60">
                <Zap className="h-3 w-3" />
                Fast
              </span>
              <span className="hidden sm:inline">Federal Polytechnic, Ado Ekiti</span>
            </div>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}

function renderPage(page: Page, role: string) {
  switch (page) {
    case "dashboard":
      return <DashboardPanel />
    case "students":
      // Only admin can manage students
      if (role !== "ADMIN") return <DashboardPanel />
      return <StudentsPanel />
    case "lecturers":
      // Only admin can manage lecturers
      if (role !== "ADMIN") return <DashboardPanel />
      return <LecturersPanel />
    case "courses":
      return <CoursesPanel />
    case "attendance":
      // Students can't access attendance management
      if (role === "STUDENT") return <DashboardPanel />
      return <AttendancePanel />
    case "reports":
      return <ReportsPanel />
    case "student-portal":
      return <StudentPortalPanel />
    default:
      return <DashboardPanel />
  }
}
