import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/store'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  return NextResponse.json({ session })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const body = await req.json()
  const { answers, flagged, currentQuestionIndex } = body as {
    answers?: Record<string, number[]>
    flagged?: string[]
    currentQuestionIndex?: number
  }

  const updated = updateSession(sessionId, {
    ...(answers !== undefined && { answers }),
    ...(flagged !== undefined && { flagged }),
    ...(currentQuestionIndex !== undefined && { currentQuestionIndex }),
  })

  if (!updated) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
