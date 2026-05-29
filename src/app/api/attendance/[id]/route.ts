import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await db.attendanceSession.findUnique({
      where: { id },
      include: {
        course: {
          include: { department: true, lecturer: true },
        },
        lecturer: {
          include: { department: true },
        },
        records: {
          include: {
            student: {
              include: { department: true },
            },
          },
          orderBy: { markedAt: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Failed to fetch attendance session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance session' },
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
    const { endTime, isActive, date } = body

    const existing = await db.attendanceSession.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      )
    }

    const session = await db.attendanceSession.update({
      where: { id },
      data: {
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: {
        course: {
          include: { department: true, lecturer: true },
        },
        lecturer: {
          include: { department: true },
        },
        records: {
          include: {
            student: { include: { department: true } },
          },
        },
      },
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Failed to update attendance session:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance session' },
      { status: 500 }
    )
  }
}
