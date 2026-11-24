'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ExamSession, Question, ExamResult, AttemptRecord } from '@/types/exam'
import { isCorrect } from '@/lib/scoring'
import { addAttemptDirect } from '@/lib/useHistory'

function domainColor(d: string) {
  if (d.startsWith('Agentic')) return 'bg-blue-500'
  if (d.startsWith('Tool')) return 'bg-violet-500'
  if (d.startsWith('Claude Code')) return 'bg-emerald-500'
  if (d.startsWith('Prompt')) return 'bg-amber-500'
  if (d.startsWith('Context')) return 'bg-cyan-500'
  return 'bg-gray-400'
}

function ScoreGauge({ score }: { score: number }) {
  const pct = ((score - 100) / 900) * 100
  const passPct = ((720 - 100) / 900) * 100

  return (
    <div className="relative h-8 bg-gray-100 rounded-full overflow-visible mt-4">
      {/* Filled bar */}
      <div
        className={`h-full rounded-full transition-all ${score >= 720 ? 'bg-green-500' : 'bg-red-500'}`}
        style={{ width: `${pct}%` }}
      />
      {/* Passing line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10"
        style={{ left: `${passPct}%` }}
        title="Passing score: 720"
      >
        <div className="absolute -top-6 -translate-x-1/2 text-xs font-bold text-slate-600 whitespace-nowrap">
          720
        </div>
      </div>
      {/* Score label */}
      <div
        className="absolute top-0 bottom-0 flex items-center pr-2 justify-end"
        style={{ width: `${Math.min(pct, 100)}%` }}
      >
        <span className="text-white text-xs font-bold">{score}</span>
      </div>
      {/* Scale labels */}
      <div className="absolute left-0 -bottom-5 text-xs text-gray-400">100</div>
      <div className="absolute right-0 -bottom-5 text-xs text-gray-400">1000</div>
    </div>
  )
}

type ReviewFilter = 'all' | 'incorrect' | 'flagged' | string

function ReviewCard({
  question,
  selectedIndices,
  isFlagged,
  defaultOpen,
}: {
  question: Question
  selectedIndices: number[]
  isFlagged: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const correct = isCorrect(question, selectedIndices)

  return (
    <div className={`review-card border-2 rounded-lg overflow-hidden ${correct ? 'border-green-200' : 'border-red-200'}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 ${correct ? 'bg-green-50' : 'bg-red-50'}`}
      >
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {correct ? '✓' : '✗'}
        </span>
        <span className="text-sm font-semibold text-gray-800">Q{question.qnum}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          question.domain.startsWith('Agentic') ? 'bg-blue-100 text-blue-700' :
          question.domain.startsWith('Tool') ? 'bg-violet-100 text-violet-700' :
          question.domain.startsWith('Claude Code') ? 'bg-emerald-100 text-emerald-700' :
          question.domain.startsWith('Prompt') ? 'bg-amber-100 text-amber-700' :
          question.domain.startsWith('Context') ? 'bg-cyan-100 text-cyan-700' :
          'bg-gray-100 text-gray-500'
        }`}>{question.domain}</span>
        {isFlagged && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-300">⚑ Flagged</span>
        )}
        <div
          className="exam-html flex-1 text-xs text-gray-600 truncate"
          dangerouslySetInnerHTML={{ __html: question.stem.replace(/<[^>]+>/g, ' ').trim().slice(0, 120) + '…' }}
        />
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {/* Detail */}
      {open && (
        <div className="bg-white border-t border-gray-200">
          {/* Stem */}
          <div className="px-4 pt-4 pb-2">
            <div className="exam-html text-sm text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.stem }} />
          </div>

          {/* Choices */}
          <div className="px-4 pb-4 space-y-1.5">
            {question.choices.map(c => {
              const isCorrectChoice = question.correctIndices.includes(c.idx)
              const isSelected = selectedIndices.includes(c.idx)
              return (
                <div
                  key={c.idx}
                  className={`flex items-start gap-2 p-2.5 rounded-lg text-sm border ${
                    isCorrectChoice
                      ? 'border-green-300 bg-green-50'
                      : isSelected
                      ? 'border-red-300 bg-red-50'
                      : 'border-transparent bg-gray-50'
                  }`}
                >
                  <span className={`font-bold text-xs flex-shrink-0 mt-0.5 ${isCorrectChoice ? 'text-green-700' : isSelected ? 'text-red-700' : 'text-gray-400'}`}>
                    {c.letter}.
                  </span>
                  <div className="exam-html text-gray-700 flex-1" dangerouslySetInnerHTML={{ __html: c.text }} />
                  <span className="flex-shrink-0 text-xs font-semibold">
                    {isCorrectChoice && '✓ Correct'}
                    {isSelected && !isCorrectChoice && '✗ Your answer'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Explanations */}
          {question.explanations.length > 0 && (
            <div className="border-t border-gray-100">
              {question.explanations.map(e => (
                <div key={e.idx} className={`flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${question.correctIndices.includes(e.idx) ? 'bg-green-50' : 'bg-white'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${question.correctIndices.includes(e.idx) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {e.letter}
                  </div>
                  <div className="exam-html text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: e.text }} />
                </div>
              ))}
            </div>
          )}

          {/* Key learning */}
          {question.keyLearning && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 py-3">
              <div className="text-xs font-bold text-amber-700 mb-1">💡 Key Learning Point</div>
              <div className="text-sm text-gray-700">{question.keyLearning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  const [session, setSession] = useState<ExamSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [domainFilter, setDomainFilter] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(({ session: s, error }) => {
        if (error || !s) {
          router.replace('/')
          return
        }
        if (!s.submittedAt) {
          router.replace(`/exam/${sessionId}`)
          return
        }
        setSession(s)
        setLoading(false)
        // Persist attempt record to this browser's localStorage
        if (s.result) {
          const record: AttemptRecord = {
            sessionId: s.id,
            certId: s.certId ?? 'ccar-f',
            sourceLabel: s.sourceLabel,
            mode: s.settings.mode,
            submittedAt: s.submittedAt,
            scaledScore: s.result.scaledScore,
            passed: s.result.passed,
            rawScore: s.result.rawScore,
            totalQuestions: s.result.totalQuestions,
            domainScores: s.result.domainScores,
          }
          addAttemptDirect(record)
        }
      })
  }, [sessionId, router])

  if (loading || !session || !session.result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading results…</div>
      </div>
    )
  }

  const result = session.result
  const { rawScore, totalQuestions, scaledScore, passed, domainScores, timeTakenSeconds } = result

  const domains = Object.entries(domainScores).sort((a, b) => a[0].localeCompare(b[0]))

  const filteredQuestions = session.questions.filter(q => {
    const sel = session.answers[q.id] ?? []
    if (reviewFilter === 'incorrect') return !isCorrect(q, sel)
    if (reviewFilter === 'flagged') return session.flagged.includes(q.id)
    if (domainFilter) return q.domain === domainFilter
    return true
  })

  const handleRetakeMissed = async () => {
    const missedIds = session.questions
      .filter(q => !isCorrect(q, session.answers[q.id] ?? []))
      .map(q => q.id)
    if (missedIds.length === 0) return

    const r = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIds: missedIds,
        settings: {
          mode: 'practice',
          randomizeQuestions: true,
          randomizeOptions: false,
          timerMinutes: 120,
        },
        sourceLabel: `Missed from ${session.sourceLabel}`,
      }),
    })
    const { session: newSession } = await r.json()
    router.push(`/exam/${newSession.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="no-print bg-slate-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white text-sm">← Lobby</button>
        <div className="flex-1">
          <h1 className="font-bold">Score Report — {session.sourceLabel}</h1>
          <p className="text-slate-400 text-xs capitalize">{session.settings.mode} mode</p>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors border border-white/20"
        >
          ⬇ Download PDF
        </button>
        <button
          onClick={handleRetakeMissed}
          className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded transition-colors"
        >
          Retake Missed & Flagged
        </button>
      </header>

      {/* Print-only title shown at top of PDF */}
      <div className="hidden print:block px-8 pt-6 pb-2">
        <h1 className="text-2xl font-black text-gray-900">CCAR-F Score Report</h1>
        <p className="text-gray-600 mt-1">{session.sourceLabel} · {session.settings.mode} mode · {new Date(session.submittedAt!).toLocaleString()}</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Score panel */}
        <div className="score-panel bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-center">
              <div className={`text-7xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {scaledScore}
              </div>
              <div className="text-gray-400 text-sm mt-1">/ 1000</div>
              <div className={`mt-2 text-xl font-black tracking-widest ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASS' : 'FAIL'}
              </div>
            </div>

            <div className="flex-1">
              <ScoreGauge score={scaledScore} />
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{rawScore}/{totalQuestions}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((rawScore / totalQuestions) * 100)}%
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {timeTakenSeconds
                      ? `${Math.floor(timeTakenSeconds / 60)}m`
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Time taken</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Domain Performance</h2>
          <div className="space-y-3">
            {domains.map(([domain, { correct, total, pct }]) => (
              <div key={domain}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <button
                    onClick={() => setDomainFilter(domainFilter === domain ? null : domain)}
                    className={`font-medium text-left hover:underline ${domainFilter === domain ? 'text-indigo-600' : 'text-gray-800'}`}
                  >
                    {domain}
                  </button>
                  <span className={`font-semibold text-sm ${pct >= 72 ? 'text-green-600' : 'text-red-600'}`}>
                    {correct}/{total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 72 ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct < 72 && (
                  <div className="text-xs text-red-500 mt-0.5">Below 72% — needs improvement</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Answer review */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Answer Review</h2>
            <div className="no-print flex gap-1 flex-wrap">
              {(['all', 'incorrect', 'flagged'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setReviewFilter(f); setDomainFilter(null) }}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                    reviewFilter === f && !domainFilter
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? `All (${session.questions.length})` :
                   f === 'incorrect' ? `Incorrect (${session.questions.filter(q => !isCorrect(q, session.answers[q.id] ?? [])).length})` :
                   `Flagged (${session.flagged.length})`}
                </button>
              ))}
              {domainFilter && (
                <button
                  onClick={() => setDomainFilter(null)}
                  className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                >
                  {domainFilter.split(' ')[0]}… ×
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No questions match this filter.</div>
            ) : (
              filteredQuestions.map(q => (
                <ReviewCard
                  key={q.id}
                  question={q}
                  selectedIndices={session.answers[q.id] ?? []}
                  isFlagged={session.flagged.includes(q.id)}
                  defaultOpen={!isCorrect(q, session.answers[q.id] ?? [])}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
