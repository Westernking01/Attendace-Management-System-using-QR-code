import { useQuery } from "@tanstack/react-query"

export const useStudents = () => useQuery({
  queryKey: ["students"],
  queryFn: async () => {
    const res = await fetch("/api/students")
    if (!res.ok) throw new Error("Failed to fetch students")
    return res.json()
  },
  staleTime: 1000 * 60 * 5,
})

export const useDepartments = () => useQuery({
  queryKey: ["departments"],
  queryFn: async () => {
    const res = await fetch("/api/departments")
    if (!res.ok) throw new Error("Failed to fetch departments")
    return res.json()
  },
  staleTime: 1000 * 60 * 30,
})

export const useCourses = (params?: { studentId?: string; lecturerId?: string }) => useQuery({
  queryKey: ["courses", params],
  queryFn: async () => {
    const searchParams = new URLSearchParams()
    if (params?.studentId) searchParams.set("studentId", params.studentId)
    if (params?.lecturerId) searchParams.set("lecturerId", params.lecturerId)
    const res = await fetch(`/api/courses?${searchParams.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch courses")
    return res.json()
  },
  staleTime: 1000 * 60 * 10,
})

export const useAttendance = () => useQuery({
  queryKey: ["attendance"],
  queryFn: async () => {
    const res = await fetch("/api/attendance")
    if (!res.ok) throw new Error("Failed to fetch attendance")
    return res.json()
  },
})

export const useReports = (params?: any) => useQuery({
  queryKey: ["reports", params],
  queryFn: async () => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all") searchParams.set(key, value as string)
      })
    }
    const res = await fetch(`/api/reports?${searchParams.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch reports")
    return res.json()
  },
})

export const useDashboardStats = () => useQuery({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    const res = await fetch("/api/dashboard/stats")
    if (!res.ok) throw new Error("Failed to fetch dashboard stats")
    return res.json()
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
})

