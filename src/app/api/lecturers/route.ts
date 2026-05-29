import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const lecturers = await db.lecturer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        department: true,
        courses: {
          include: { department: true },
          orderBy: [{ code: 'asc' }],
        },
        _count: { select: { courses: true } },
      },
    })
    return NextResponse.json(lecturers)
  } catch (error) {
    console.error('Failed to fetch lecturers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lecturers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffId, firstName, lastName, email, phone, departmentId, password, courseIds } = body

    if (!staffId || !firstName || !lastName || !email || !departmentId) {
      return NextResponse.json(
        { error: 'staffId, firstName, lastName, email, and departmentId are required' },
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

    // Validate courseIds if provided
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
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

    // Default password: staffId if not provided, or custom password
    const defaultPassword = password || staffId
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const lecturer = await db.lecturer.create({
      data: {
        staffId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        departmentId,
      },
      include: { department: true },
    })

    // Auto-create a User account for this lecturer
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'LECTURER',
        name: `${firstName} ${lastName}`,
        avatar: `${firstName[0]}${lastName[0]}`,
        lecturerId: lecturer.id,
        isActive: true,
      },
    })

    // Assign courses to this lecturer
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      await db.course.updateMany({
        where: { id: { in: courseIds } },
        data: { lecturerId: lecturer.id },
      })
    }

    // Re-fetch with courses included
    const result = await db.lecturer.findUnique({
      where: { id: lecturer.id },
      include: {
        department: true,
        courses: {
          include: { department: true },
          orderBy: [{ code: 'asc' }],
        },
        _count: { select: { courses: true } },
      },
    })

    return NextResponse.json({
      ...result,
      generatedCredentials: {
        email,
        password: defaultPassword,
        note: 'Lecturer can change their password after first login',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Failed to create lecturer:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Lecturer with this staff ID or email already exists'
        : 'Failed to create lecturer'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
