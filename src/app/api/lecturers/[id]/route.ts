import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lecturer = await db.lecturer.findUnique({
      where: { id },
      include: {
        department: true,
        courses: {
          include: { department: true },
        },
      },
    })

    if (!lecturer) {
      return NextResponse.json(
        { error: 'Lecturer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(lecturer)
  } catch (error) {
    console.error('Failed to fetch lecturer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lecturer' },
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
    const { firstName, lastName, email, phone, departmentId, courseIds } = body

    const existing = await db.lecturer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lecturer not found' },
        { status: 404 }
      )
    }

    const lecturer = await db.lecturer.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(departmentId !== undefined && { departmentId }),
      },
      include: { department: true },
    })

    // Handle course assignments if courseIds is provided
    if (courseIds !== undefined && Array.isArray(courseIds)) {
      // Validate all courses exist
      if (courseIds.length > 0) {
        const coursesExist = await db.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true },
        })
        if (coursesExist.length !== courseIds.length) {
          return NextResponse.json(
            { error: 'One or more courses not found' },
            { status: 404 }
          )
        }
      }

      // Unassign all current courses from this lecturer
      await db.course.updateMany({
        where: { lecturerId: id },
        data: { lecturerId: null },
      })

      // Assign the new courses
      if (courseIds.length > 0) {
        await db.course.updateMany({
          where: { id: { in: courseIds } },
          data: { lecturerId: id },
        })
      }
    }

    // Re-fetch with courses included
    const result = await db.lecturer.findUnique({
      where: { id },
      include: {
        department: true,
        courses: {
          include: { department: true },
          orderBy: [{ code: 'asc' }],
        },
        _count: { select: { courses: true } },
      },
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Failed to update lecturer:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Lecturer with this staff ID or email already exists'
        : 'Failed to update lecturer'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.lecturer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lecturer not found' },
        { status: 404 }
      )
    }

    await db.lecturer.delete({ where: { id } })

    return NextResponse.json({ message: 'Lecturer deleted successfully' })
  } catch (error) {
    console.error('Failed to delete lecturer:', error)
    return NextResponse.json(
      { error: 'Failed to delete lecturer' },
      { status: 500 }
    )
  }
}
