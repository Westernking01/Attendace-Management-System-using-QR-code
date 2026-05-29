import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lecturerId = searchParams.get('lecturerId')
    const studentId = searchParams.get('studentId')

    // Build the where clause based on filters
    const where: Record<string, unknown> = {}

    if (lecturerId) {
      where.lecturerId = lecturerId
    }

    if (studentId) {
      where.enrollments = {
        some: { studentId }
      }
    }

    const courses = await db.course.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        department: true,
        lecturer: true,
        _count: {
          select: { enrollments: true, sessions: true },
        },
        ...(studentId ? {
          enrollments: {
            where: { studentId },
            select: { enrolledAt: true },
          }
        } : {}),
      },
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Failed to fetch courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, title, unit, semester, session, departmentId, lecturerId } = body

    if (!code || !title || !unit || !semester || !session || !departmentId) {
      return NextResponse.json(
        { error: 'code, title, unit, semester, session, and departmentId are required' },
        { status: 400 }
      )
    }

    const department = await db.department.findUnique({ where: { id: departmentId } })
    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    if (lecturerId) {
      const lecturer = await db.lecturer.findUnique({ where: { id: lecturerId } })
      if (!lecturer) {
        return NextResponse.json(
          { error: 'Lecturer not found' },
          { status: 404 }
        )
      }
    }

    const course = await db.course.create({
      data: {
        code: code.toUpperCase(),
        title,
        unit: parseInt(unit),
        semester,
        session,
        departmentId,
        lecturerId: lecturerId || null,
      },
      include: { department: true, lecturer: true },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error: unknown) {
    console.error('Failed to create course:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Course with this code already exists'
        : 'Failed to create course'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
