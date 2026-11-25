import { NextResponse } from 'next/server'
import { getSession, updateSession, persistSession } from '@/lib/store'
import { calculateResult } from '@/lib/scoring'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const session = await getSession(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.submittedAt) {
    return NextResponse.json({ result: session.result })
  }

  const { timeTakenSeconds } = (await req.json()) as { timeTakenSeconds?: number }
  const submittedAt = new Date().toISOString()

  const result = calculateResult(session.questions, session.answers, timeTakenSeconds)

  await updateSession(sessionId, { result, submittedAt })

  const completed = await getSession(sessionId)
  if (completed) await persistSession(completed)

  return NextResponse.json({ result })
}
