import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'studentIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    const course = await db.course.findUnique({ where: { id } })
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Verify all students exist
    const students = await db.student.findMany({
      where: { id: { in: studentIds } },
    })

    if (students.length !== studentIds.length) {
      const foundIds = students.map((s) => s.id)
      const missingIds = studentIds.filter((sid: string) => !foundIds.includes(sid))
      return NextResponse.json(
        { error: `Students not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Check for existing enrollments to avoid unique constraint violations
    const existingEnrollments = await db.courseEnrollment.findMany({
      where: {
        courseId: id,
        studentId: { in: studentIds },
      },
    })

    const alreadyEnrolledIds = new Set(existingEnrollments.map((e) => e.studentId))
    const newStudentIds = studentIds.filter((sid: string) => !alreadyEnrolledIds.has(sid))

    if (newStudentIds.length === 0) {
      return NextResponse.json(
        { error: 'All students are already enrolled in this course' },
        { status: 400 }
      )
    }

    // Create enrollment records
    const enrollments = await db.$transaction(
      newStudentIds.map((studentId: string) =>
        db.courseEnrollment.create({
          data: { courseId: id, studentId },
          include: {
            student: { include: { department: true } },
            course: { include: { department: true } },
          },
        })
      )
    )

    return NextResponse.json(
      {
        message: `${enrollments.length} student(s) enrolled successfully`,
        enrolled: enrollments,
        alreadyEnrolled: alreadyEnrolledIds.size,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to enroll students:', error)
    return NextResponse.json(
      { error: 'Failed to enroll students' },
      { status: 500 }
    )
  }
}
