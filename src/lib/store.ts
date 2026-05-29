import { create } from "zustand"

export type Page =
  | "dashboard"
  | "students"
  | "lecturers"
  | "courses"
  | "attendance"
  | "reports"
  | "student-portal"

export type UserRole = "ADMIN" | "LECTURER" | "STUDENT"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  studentId: string | null
  lecturerId: string | null
  image?: string | null
}

interface AppState {
  // Auth state
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void

  // Navigation state
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Selection state
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  selectedCourseId: string | null
  setSelectedCourseId: (id: string | null) => void
  selectedSessionId: string | null
  setSelectedSessionId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false, currentPage: "dashboard" }),

  // Navigation
  currentPage: "dashboard",
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Selections
  selectedStudentId: null,
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  selectedCourseId: null,
  setSelectedCourseId: (id) => set({ selectedCourseId: id }),
  selectedSessionId: null,
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),
}))

export const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard",
  students: "Students",
  lecturers: "Lecturers",
  courses: "Courses",
  attendance: "Attendance",
  reports: "Reports",
  "student-portal": "Student Portal",
}

// Role-based page titles
export const rolePageTitles: Record<UserRole, Record<Page, string>> = {
  ADMIN: {
    dashboard: "Admin Dashboard",
    students: "Students",
    lecturers: "Lecturers",
    courses: "Courses",
    attendance: "Attendance",
    reports: "Reports",
    "student-portal": "Student Portal",
  },
  LECTURER: {
    dashboard: "Lecturer Dashboard",
    students: "My Students",
    lecturers: "Lecturers",
    courses: "My Courses",
    attendance: "Take Attendance",
    reports: "Reports",
    "student-portal": "Student Portal",
  },
  STUDENT: {
    dashboard: "My Dashboard",
    students: "Students",
    lecturers: "Lecturers",
    courses: "My Courses",
    attendance: "Attendance",
    reports: "My Reports",
    "student-portal": "My Portal",
  },
}
