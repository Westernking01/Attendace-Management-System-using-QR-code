import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        studentId: session.user.studentId,
        lecturerId: session.user.lecturerId,
        image: session.user.image,
      },
    })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ user: null })
  }
}
