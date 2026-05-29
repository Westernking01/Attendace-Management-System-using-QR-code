import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const results: Record<string, { ok: boolean; error?: string; count?: number }> = {}

  try {
    await db.$queryRaw`SELECT 1 as test`
    results.database = { ok: true }
  } catch (error) {
    results.database = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  try {
    const count = await db.department.count()
    results.departments = { ok: true, count }
  } catch (error) {
    results.departments = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  try {
    const count = await db.user.count()
    results.users = { ok: true, count }
  } catch (error) {
    results.users = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  try {
    const count = await db.student.count()
    results.students = { ok: true, count }
  } catch (error) {
    results.students = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  try {
    const count = await db.lecturer.count()
    results.lecturers = { ok: true, count }
  } catch (error) {
    results.lecturers = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  try {
    const count = await db.course.count()
    results.courses = { ok: true, count }
  } catch (error) {
    results.courses = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  results.env = {
    ok: !!(process.env.DATABASE_URL && process.env.NEXTAUTH_SECRET),
    error: [
      !process.env.DATABASE_URL && 'DATABASE_URL missing',
      !process.env.DIRECT_URL && 'DIRECT_URL missing',
      !process.env.NEXTAUTH_SECRET && 'NEXTAUTH_SECRET missing',
      !process.env.NEXTAUTH_URL && 'NEXTAUTH_URL missing',
    ].filter(Boolean).join(', ') || undefined,
  }

  const allOk = Object.values(results).every(r => r.ok)

  return NextResponse.json({
    status: allOk ? 'HEALTHY' : 'UNHEALTHY',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    results,
  }, { status: allOk ? 200 : 500 })
}