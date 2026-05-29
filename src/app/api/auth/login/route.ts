import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { encode } from "next-auth/jwt"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email },
      include: {
        student: { include: { department: true } },
        lecturer: { include: { department: true } },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Create NextAuth JWT session token directly (bypasses CSRF issues)
    const secret = process.env.NEXTAUTH_SECRET || "attendq-super-secret-key-2025-production"
    const maxAge = 24 * 60 * 60 // 24 hours

    const token = await encode({
      token: {
        role: user.role,
        userId: user.id,
        studentId: user.studentId,
        lecturerId: user.lecturerId,
        email: user.email,
        name: user.name,
        picture: user.avatar || null,
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + maxAge,
        jti: crypto.randomUUID(),
      },
      secret,
      maxAge,
    })

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      lecturerId: user.lecturerId,
      image: user.avatar || null,
    }

    // Set the session cookie and return user data
    const response = NextResponse.json({
      success: true,
      user: userData,
    })

    response.cookies.set({
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
