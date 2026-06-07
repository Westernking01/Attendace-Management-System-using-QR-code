import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const [
      studentCount,
      lecturerCount,
      courseCount,
      activeSessions,
      recentRecords,
      allRecords,
      courses,
      sessions,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.lecturer.count(),
      prisma.course.count(),
      prisma.attendanceSession.count({ where: { isActive: true } }),
      prisma.attendanceRecord.findMany({
        take: 5,
        orderBy: { markedAt: "desc" },
        include: {
          student: true,
          session: { include: { course: true } },
        },
      }),
      prisma.attendanceRecord.findMany({
        include: {
          student: { include: { department: true } },
          session: { include: { course: { include: { department: true } } } },
        },
      }),
      prisma.course.findMany({
        include: { _count: { select: { enrollments: true, sessions: true } } },
      }),
      prisma.attendanceSession.findMany({
        include: {
          course: { select: { id: true, code: true, title: true } },
          _count: { select: { records: true } }
        }
      })
    ])

    return NextResponse.json({
      stats: {
        students: studentCount,
        lecturers: lecturerCount,
        courses: courseCount,
        sessions: activeSessions,
      },
      recentRecords,
      allRecords,
      courses,
      sessions,
    })
  } catch (error) {
    console.error("Dashboard stats fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
