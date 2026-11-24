import { NextResponse } from 'next/server'
import { getCerts } from '@/lib/store'

export async function GET() {
  return NextResponse.json({ certs: getCerts() })
}
