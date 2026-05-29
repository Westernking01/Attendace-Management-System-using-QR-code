import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear the NextAuth session cookie
  response.cookies.set({
    name: "next-auth.session-token",
    value: "",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: -1, // Delete the cookie
    path: "/",
  })

  // Also clear the CSRF token cookie
  response.cookies.set({
    name: "next-auth.csrf-token",
    value: "",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: -1,
    path: "/",
  })

  return response
}
