import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { students: true, lecturers: true, courses: true },
        },
      },
    })
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const department = await db.department.create({
      data: { name, code: code.toUpperCase() },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error: unknown) {
    console.error('Failed to create department:', error)
    const message =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'Department with this name or code already exists'
        : 'Failed to create department'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
