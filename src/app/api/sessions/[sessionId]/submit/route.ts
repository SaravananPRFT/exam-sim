import { NextResponse } from 'next/server'
import { getSession, updateSession, persistSession } from '@/lib/store'
import { calculateResult } from '@/lib/scoring'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.submittedAt) {
    return NextResponse.json({ result: session.result })
  }

  const { timeTakenSeconds } = (await req.json()) as { timeTakenSeconds?: number }
  const submittedAt = new Date().toISOString()

  const result = calculateResult(session.questions, session.answers, timeTakenSeconds)

  updateSession(sessionId, { result, submittedAt })

  const completed = getSession(sessionId)
  if (completed) persistSession(completed)

  return NextResponse.json({ result })
}
