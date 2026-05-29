import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')
    const level = searchParams.get('level')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build the where clause for attendance sessions
    const sessionWhere: Prisma.AttendanceSessionWhereInput = {}
    if (courseId) sessionWhere.courseId = courseId
    if (dateFrom || dateTo) {
      sessionWhere.date = {}
      if (dateFrom) sessionWhere.date.gte = new Date(dateFrom)
      if (dateTo) sessionWhere.date.lte = new Date(dateTo)
    }

    // Build the where clause for records
    const recordWhere: Prisma.AttendanceRecordWhereInput = {}
    if (studentId) recordWhere.studentId = studentId
    if (level) {
      recordWhere.student = {
        level: level,
      }
    }

    // Get total sessions matching filters
    const totalSessions = await db.attendanceSession.count({
      where: sessionWhere,
    })

    // Get records with details
    const records = await db.attendanceRecord.findMany({
      where: {
        ...recordWhere,
        session: {
          ...sessionWhere,
        },
      },
      include: {
        student: {
          include: { department: true },
        },
        session: {
          include: {
            course: {
              include: { department: true },
            },
            lecturer: true,
          },
        },
      },
      orderBy: { markedAt: 'desc' },
    })

    // Calculate stats
    const totalPresent = records.length

    // Get enrolled students count for relevant courses
    let averageAttendance = 0
    if (totalSessions > 0) {
      // If filtering by level, we need to adjust the denominator
      if (level) {
        // Count enrolled students in the level for each session's course
        const sessions = await db.attendanceSession.findMany({
          where: sessionWhere,
          include: {
            course: {
              include: {
                enrollments: {
                  where: { student: { level } },
                  select: { studentId: true },
                },
              },
            },
            _count: {
              select: { records: true },
            },
          },
        })

        let totalRate = 0
        let sessionsWithEnrollments = 0

        for (const session of sessions) {
          const enrolledCount = session.course.enrollments.length
          if (enrolledCount > 0) {
            // Count records for this session from students at this level
            const levelRecords = records.filter(
              (r) => r.sessionId === session.id
            ).length
            totalRate += (levelRecords / enrolledCount) * 100
            sessionsWithEnrollments++
          }
        }

        averageAttendance =
          sessionsWithEnrollments > 0
            ? Math.round((totalRate / sessionsWithEnrollments) * 100) / 100
            : 0
      } else {
        // Original logic when no level filter
        const sessions = await db.attendanceSession.findMany({
          where: sessionWhere,
          include: {
            course: {
              include: {
                _count: { select: { enrollments: true } },
              },
            },
            _count: {
              select: { records: true },
            },
          },
        })

        let totalRate = 0
        let sessionsWithEnrollments = 0

        for (const session of sessions) {
          const enrolledCount = session.course._count.enrollments
          if (enrolledCount > 0) {
            totalRate += (session._count.records / enrolledCount) * 100
            sessionsWithEnrollments++
          }
        }

        averageAttendance =
          sessionsWithEnrollments > 0
            ? Math.round((totalRate / sessionsWithEnrollments) * 100) / 100
            : 0
      }
    }

    return NextResponse.json({
      totalSessions,
      totalPresent,
      averageAttendance,
      records,
    })
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
