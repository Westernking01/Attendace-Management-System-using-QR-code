// app/api/debug/route.ts
export async function GET() {
  return Response.json({
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasUrl: !!process.env.NEXTAUTH_URL,
    url: process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  })
}