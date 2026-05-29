import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      include: {
        department: true,
        enrollments: {
          include: {
            course: {
              include: { department: true, lecturer: true },
            },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Failed to fetch student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
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
    const { firstName, lastName, email, phone, departmentId, level } = body

    const existing = await db.student.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(departmentId !== undefined && { departmentId }),
        ...(level !== undefined && { level }),
      },
      include: { department: true },
    })

    return NextResponse.json(student)
  } catch (error: unknown) {
    console.error('Failed to update student:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Student with this email or matric number already exists'
        : 'Failed to update student'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.student.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    await db.student.delete({ where: { id } })

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Failed to delete student:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
}
