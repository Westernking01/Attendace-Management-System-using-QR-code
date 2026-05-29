import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.courseEnrollment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    await db.courseEnrollment.delete({ where: { id } })

    return NextResponse.json({ message: 'Enrollment removed successfully' })
  } catch (error) {
    console.error('Failed to remove enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to remove enrollment' },
      { status: 500 }
    )
  }
}
