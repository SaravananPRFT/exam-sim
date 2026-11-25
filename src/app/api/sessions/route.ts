import { NextResponse } from 'next/server'
import { getQuestionsForSet, getAllSets, getQuestionsByIds, saveSession, getAllSessions } from '@/lib/store'
import type { ExamSession, ExamSettings, Question, Choice, Explanation } from '@/types/exam'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleOptions(question: Question): Question {
  const n = question.choices.length
  const positions = shuffle(Array.from({ length: n }, (_, i) => i))
  const oldToNew: Record<number, number> = {}
  positions.forEach((oldIdx, newIdx) => { oldToNew[oldIdx] = newIdx })

  const newChoices: Choice[] = positions.map((oldIdx, newIdx) => ({
    ...question.choices[oldIdx],
    idx: newIdx,
    letter: 'ABCD'[newIdx] ?? String(newIdx),
  }))

  const explMap = new Map(question.explanations.map(e => [e.idx, e]))
  const newExplanations: Explanation[] = positions.map((oldIdx, newIdx) => {
    const e = explMap.get(oldIdx)
    return {
      idx: newIdx,
      letter: 'ABCD'[newIdx] ?? String(newIdx),
      text: e?.text ?? '',
    }
  })

  return {
    ...question,
    choices: newChoices,
    correctIndices: question.correctIndices.map(o => oldToNew[o] ?? o),
    explanations: newExplanations,
  }
}

interface CreateSessionBody {
  certId: string
  setIds?: string[]
  questionIds?: string[]
  questionCount?: number
  settings: ExamSettings
  sourceLabel: string
}

export async function POST(req: Request) {
  const body: CreateSessionBody = await req.json()
  const { certId, setIds = [], questionIds, questionCount, settings, sourceLabel } = body

  let pool: Question[]
  if (questionIds && questionIds.length > 0) {
    pool = await getQuestionsByIds(certId, questionIds)
  } else if (setIds.length > 0) {
    const perSet = await Promise.all(setIds.map(id => getQuestionsForSet(certId, id)))
    pool = perSet.flat()
  } else {
    const allSets = await getAllSets(certId)
    const perSet = await Promise.all(allSets.map(s => getQuestionsForSet(certId, s.id)))
    pool = perSet.flat()
  }

  if (questionCount && questionCount < pool.length) {
    pool = shuffle(pool).slice(0, questionCount)
  }

  if (settings.randomizeQuestions) {
    pool = shuffle(pool)
  }

  if (settings.randomizeOptions) {
    pool = pool.map(shuffleOptions)
  }

  const session: ExamSession = {
    id: crypto.randomUUID(),
    certId,
    setIds,
    sourceLabel,
    questions: pool,
    answers: {},
    flagged: [],
    currentQuestionIndex: 0,
    settings,
    startedAt: new Date().toISOString(),
  }

  await saveSession(session)

  return NextResponse.json({ session })
}

export async function GET() {
  return NextResponse.json({ sessions: await getAllSessions() })
}
