import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { qrCodeData, studentId, method } = body

    // Validate input: either qrCodeData or studentId must be provided
    if (!qrCodeData && !studentId) {
      return NextResponse.json(
        { error: 'Either qrCodeData or studentId is required' },
        { status: 400 }
      )
    }

    // Find the attendance session
    const session = await db.attendanceSession.findUnique({
      where: { id },
      include: {
        course: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      )
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: 'Attendance session is no longer active' },
        { status: 400 }
      )
    }

    // Find the student
    let student
    if (qrCodeData) {
      student = await db.student.findUnique({
        where: { qrCodeData },
        include: { department: true },
      })
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found with the provided QR code' },
          { status: 404 }
        )
      }
    } else {
      student = await db.student.findUnique({
        where: { id: studentId },
        include: { department: true },
      })
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }
    }

    // Check if student is enrolled in the course
    const enrollment = await db.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: session.courseId,
          studentId: student.id,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this course' },
        { status: 400 }
      )
    }

    // Check if already marked for this session
    const existingRecord = await db.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: id,
          studentId: student.id,
        },
      },
    })

    if (existingRecord) {
      return NextResponse.json(
        {
          error: 'Attendance already marked for this student in this session',
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            matricNo: student.matricNo,
          },
          markedAt: existingRecord.markedAt,
        },
        { status: 409 }
      )
    }

    // Create attendance record
    const record = await db.attendanceRecord.create({
      data: {
        sessionId: id,
        studentId: student.id,
        method: method === 'manual' ? 'manual' : 'qr_scan',
      },
      include: {
        student: {
          include: { department: true },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Attendance marked successfully',
        record,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to mark attendance:', error)
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}
