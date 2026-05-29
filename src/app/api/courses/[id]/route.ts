import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const course = await db.course.findUnique({
      where: { id },
      include: {
        department: true,
        lecturer: true,
        enrollments: {
          include: {
            student: {
              include: { department: true },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Failed to fetch course:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, title, unit, semester, session, departmentId, lecturerId } = body

    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const course = await db.course.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(title !== undefined && { title }),
        ...(unit !== undefined && { unit: parseInt(unit) }),
        ...(semester !== undefined && { semester }),
        ...(session !== undefined && { session }),
        ...(departmentId !== undefined && { departmentId }),
        ...(lecturerId !== undefined && { lecturerId: lecturerId || null }),
      },
      include: { department: true, lecturer: true },
    })

    return NextResponse.json(course)
  } catch (error: unknown) {
    console.error('Failed to update course:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Course with this code already exists'
        : 'Failed to update course'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    await db.course.delete({ where: { id } })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Failed to delete course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
