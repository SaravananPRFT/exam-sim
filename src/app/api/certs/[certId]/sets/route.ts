import { NextResponse } from 'next/server'
import { getAllSets, rescanSets } from '@/lib/store'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params
  return NextResponse.json({ sets: getAllSets(certId) })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params
  const cache = rescanSets(certId)
  return NextResponse.json({ sets: cache.sets, rescanned: true })
}
