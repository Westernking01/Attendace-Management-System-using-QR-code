import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const sessions = await db.attendanceSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          include: { department: true, lecturer: true },
        },
        lecturer: {
          include: { department: true },
        },
        _count: {
          select: { records: true },
        },
      },
    })
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Failed to fetch attendance sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { courseId, lecturerId, date } = body

    if (!courseId || !lecturerId) {
      return NextResponse.json(
        { error: 'courseId and lecturerId are required' },
        { status: 400 }
      )
    }

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const lecturer = await db.lecturer.findUnique({ where: { id: lecturerId } })
    if (!lecturer) {
      return NextResponse.json(
        { error: 'Lecturer not found' },
        { status: 404 }
      )
    }

    const session = await db.attendanceSession.create({
      data: {
        courseId,
        lecturerId,
        date: date ? new Date(date) : new Date(),
        startTime: new Date(),
        isActive: true,
      },
      include: {
        course: {
          include: { department: true, lecturer: true },
        },
        lecturer: {
          include: { department: true },
        },
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Failed to create attendance session:', error)
    return NextResponse.json(
      { error: 'Failed to create attendance session' },
      { status: 500 }
    )
  }
}
