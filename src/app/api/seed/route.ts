import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    await db.attendanceRecord.deleteMany()
    await db.attendanceSession.deleteMany()
    await db.courseEnrollment.deleteMany()
    await db.user.deleteMany()
    await db.course.deleteMany()
    await db.lecturer.deleteMany()
    await db.student.deleteMany()
    await db.department.deleteMany()

    const adminPassword = await bcrypt.hash('Admin123', 10)

    const departments = []
    const deptData = [
      { name: 'Computer Science', code: 'CS' },
      { name: 'Office Technology Management', code: 'OTM' },
      { name: 'Banking and Finance', code: 'BF' },
      { name: 'Science Laboratory Technology', code: 'SLT' },
      { name: 'Food Technology', code: 'FT' },
      { name: 'Electrical and Electronics Engineering', code: 'EEE' },
      { name: 'Civil Engineering', code: 'CE' },
      { name: 'Business Administration', code: 'BA' },
    ]

    for (const dept of deptData) {
      const department = await db.department.create({ data: dept })
      departments.push(department)
    }

    await db.user.create({
      data: {
        email: 'Admin@gmail.com',
        password: adminPassword,
        role: 'ADMIN',
        name: 'System Admin',
        avatar: 'SA',
        isActive: true,
      },
    })

    return NextResponse.json({
      message: 'Database seeded successfully',
      summary: { departments: departments.length, adminCreated: true },
      credentials: { admin: { email: 'Admin@gmail.com', password: 'Admin123' } },
    })
  } catch (error) {
    console.error('Failed to seed database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}