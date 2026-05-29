import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function generateQrCodeData(matricNo: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `QR-${matricNo}-${random}`
}

export async function GET() {
  try {
    const students = await db.student.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { department: true },
    })
    return NextResponse.json(students)
  } catch (error) {
    console.error('Failed to fetch students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { matricNo, firstName, lastName, email, phone, departmentId, level, password } = body

    if (!matricNo || !firstName || !lastName || !email || !departmentId || !level) {
      return NextResponse.json(
        { error: 'matricNo, firstName, lastName, email, departmentId, and level are required' },
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

    const qrCodeData = generateQrCodeData(matricNo)

    // Default password: matric number if not provided, or custom password
    const defaultPassword = password || matricNo
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const student = await db.student.create({
      data: {
        matricNo,
        firstName,
        lastName,
        email,
        phone: phone || null,
        departmentId,
        level,
        qrCodeData,
      },
      include: { department: true },
    })

    // Auto-create a User account for this student
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STUDENT',
        name: `${firstName} ${lastName}`,
        avatar: `${firstName[0]}${lastName[0]}`,
        studentId: student.id,
        isActive: true,
      },
    })

    return NextResponse.json({
      ...student,
      generatedCredentials: {
        email,
        password: defaultPassword,
        note: 'Student can change their password after first login',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Failed to create student:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Student with this matric number or email already exists'
        : 'Failed to create student'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
