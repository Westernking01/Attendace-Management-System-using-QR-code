import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import QRCode from 'qrcode'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      select: { qrCodeData: true, firstName: true, lastName: true, matricNo: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const qrData = student.qrCodeData
    const qrImageBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    })

    return new Response(new Uint8Array(qrImageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qr-${student.matricNo}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
