import type { Question, ExamResult } from '@/types/exam'

export function isCorrect(question: Question, selectedIndices: number[]): boolean {
  if (selectedIndices.length === 0) return false
  if (selectedIndices.length !== question.correctIndices.length) return false
  const selected = new Set(selectedIndices)
  return question.correctIndices.every(idx => selected.has(idx))
}

export function calculateResult(
  questions: Question[],
  answers: Record<string, number[]>,
  timeTakenSeconds?: number,
): ExamResult {
  let rawScore = 0
  const domainMap: Record<string, { correct: number; total: number }> = {}

  for (const q of questions) {
    const selected = answers[q.id] ?? []
    const correct = isCorrect(q, selected)
    if (correct) rawScore++

    if (!domainMap[q.domain]) domainMap[q.domain] = { correct: 0, total: 0 }
    domainMap[q.domain].total++
    if (correct) domainMap[q.domain].correct++
  }

  const totalQuestions = questions.length
  const scaledScore =
    totalQuestions > 0 ? Math.round(100 + (rawScore / totalQuestions) * 900) : 100

  const domainScores: Record<string, { correct: number; total: number; pct: number }> = {}
  for (const [domain, counts] of Object.entries(domainMap)) {
    domainScores[domain] = {
      ...counts,
      pct: counts.total > 0 ? Math.round((counts.correct / counts.total) * 100) : 0,
    }
  }

  return {
    rawScore,
    totalQuestions,
    scaledScore,
    passed: scaledScore >= 720,
    domainScores,
    timeTakenSeconds,
  }
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
