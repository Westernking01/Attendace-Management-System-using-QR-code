import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Clear existing data (in reverse dependency order)
    await db.attendanceRecord.deleteMany()
    await db.attendanceSession.deleteMany()
    await db.courseEnrollment.deleteMany()
    await db.user.deleteMany()
    await db.course.deleteMany()
    await db.lecturer.deleteMany()
    await db.student.deleteMany()
    await db.department.deleteMany()

    // Hash admin password
    const adminPassword = await bcrypt.hash('Admin123', 10)

    // Create departments
    const departments = [
      { name: 'Computer Science', code: 'CS' },
      { name: 'Office Technology Management', code: 'OTM' },
      { name: 'Banking and Finance', code: 'BF' },
      { name: 'Science Laboratory Technology', code: 'SLT' },
      { name: 'Food Technology', code: 'FT' },
      { name: 'Electrical and Electronics Engineering', code: 'EEE' },
      { name: 'Civil Engineering', code: 'CE' },
      { name: 'Business Administration', code: 'BA' },
    ]

    for (const dept of departments) {
      await db.department.create({ data: dept })
    }

    // Create only the Admin user
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
      message: 'Database seeded successfully — only admin account created',
      summary: {
        departments: 8,
        students: 0,
        lecturers: 0,
        courses: 0,
      },
      credentials: {
        admin: { email: 'Admin@gmail.com', password: 'Admin123' },
      },
    })
  } catch (error) {
    console.error('Failed to seed database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
