'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ExamSession, Question, ExamMode } from '@/types/exam'

function formatTime(s: number): string {
  if (s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function domainColor(d: string) {
  if (d.startsWith('Agentic')) return 'bg-blue-100 text-blue-700'
  if (d.startsWith('Tool')) return 'bg-violet-100 text-violet-700'
  if (d.startsWith('Claude Code')) return 'bg-emerald-100 text-emerald-700'
  if (d.startsWith('Prompt')) return 'bg-amber-100 text-amber-700'
  if (d.startsWith('Context')) return 'bg-cyan-100 text-cyan-700'
  return 'bg-gray-100 text-gray-500'
}

function ChoiceButton({
  question,
  choiceIdx,
  selected,
  revealed,
  mode,
  disabled,
  onSelect,
}: {
  question: Question
  choiceIdx: number
  selected: boolean
  revealed: boolean
  mode: ExamMode
  disabled: boolean
  onSelect: (idx: number) => void
}) {
  const choice = question.choices[choiceIdx]
  if (!choice) return null

  const isCorrect = question.correctIndices.includes(choice.idx)
  const showFeedback = mode === 'practice' && revealed

  let rowClass =
    'w-full text-left flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all cursor-pointer '
  let ctrlClass = 'w-5 h-5 flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-colors '

  if (question.isMultiSelect) {
    ctrlClass += 'rounded '
  } else {
    ctrlClass += 'rounded-full '
  }

  if (showFeedback) {
    if (isCorrect) {
      rowClass += 'border-green-400 bg-green-50'
      ctrlClass += 'border-green-500 bg-green-500'
    } else if (selected && !isCorrect) {
      rowClass += 'border-red-400 bg-red-50'
      ctrlClass += 'border-red-500 bg-red-500'
    } else {
      rowClass += 'border-gray-200 bg-gray-50 opacity-60'
      ctrlClass += 'border-gray-300'
    }
  } else if (selected) {
    rowClass += 'border-indigo-500 bg-indigo-50'
    ctrlClass += 'border-indigo-500 bg-indigo-500'
  } else {
    rowClass += 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
    ctrlClass += 'border-gray-300'
  }

  return (
    <button
      className={rowClass}
      onClick={() => !disabled && onSelect(choice.idx)}
      disabled={disabled}
    >
      <div className={ctrlClass}>
        {selected && !showFeedback && (
          question.isMultiSelect ? (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-white" />
          )
        )}
        {showFeedback && isCorrect && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {showFeedback && selected && !isCorrect && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className="font-semibold text-gray-500 flex-shrink-0 text-sm">{choice.letter}.</span>
      <div
        className="exam-html flex-1 text-sm text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: choice.text }}
      />
      {showFeedback && isCorrect && (
        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded flex-shrink-0 self-start">Correct</span>
      )}
      {showFeedback && selected && !isCorrect && (
        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded flex-shrink-0 self-start">Wrong</span>
      )}
    </button>
  )
}

function PracticeExplanations({ question }: { question: Question }) {
  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
      {question.explanations.map(e => {
        const isCorrect = question.correctIndices.includes(e.idx)
        return (
          <div
            key={e.idx}
            className={`flex gap-3 p-3.5 border-b border-gray-100 last:border-0 ${
              isCorrect ? 'bg-green-50' : 'bg-white'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {e.letter}
            </div>
            <div
              className="exam-html text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: e.text }}
            />
          </div>
        )
      })}
    </div>
  )
}

function PreSubmitReview({
  questions,
  answers,
  flagged,
  onClose,
  onSubmit,
  submitting,
}: {
  questions: Question[]
  answers: Record<string, number[]>
  flagged: Set<string>
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const answered = questions.filter(q => (answers[q.id] ?? []).length > 0).length
  const unanswered = questions.length - answered
  const flaggedCount = flagged.size

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Review Before Submitting</h2>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-green-700 font-medium">✓ {answered} answered</span>
            {unanswered > 0 && (
              <span className="text-red-600 font-medium">✗ {unanswered} unanswered</span>
            )}
            {flaggedCount > 0 && (
              <span className="text-amber-600 font-medium">⚑ {flaggedCount} flagged</span>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = (answers[q.id] ?? []).length > 0
              const isFlagged = flagged.has(q.id)
              return (
                <div
                  key={q.id}
                  className={`relative h-9 flex items-center justify-center rounded text-xs font-medium border ${
                    isAnswered
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-500 border-gray-300'
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full transform translate-x-1 -translate-y-1" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white text-gray-700 font-semibold py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Continue Reviewing
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Final Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExamPage() {
  const router = useRouter()
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  const [session, setSession] = useState<ExamSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [localAnswers, setLocalAnswers] = useState<Record<string, number[]>>({})
  const [localFlagged, setLocalFlagged] = useState<Set<string>>(new Set())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerHidden, setTimerHidden] = useState(false)
  const [showPreSubmit, setShowPreSubmit] = useState(false)
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [scratchpad, setScratchpad] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [navFilter, setNavFilter] = useState<'all' | 'unanswered' | 'flagged'>('all')
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base')

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load session
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(({ session: s, error }) => {
        if (error || !s) {
          router.replace('/?error=session-expired')
          return
        }
        setSession(s)
        setLocalAnswers(s.answers ?? {})
        setLocalFlagged(new Set(s.flagged ?? []))
        setCurrentIdx(s.currentQuestionIndex ?? 0)
        setLoading(false)

        if (s.submittedAt) {
          router.replace(`/results/${sessionId}`)
          return
        }

        // Set up timer for proctored mode
        if (s.settings.mode === 'proctored') {
          const totalSec = s.settings.timerMinutes * 60
          const elapsed = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000)
          const remaining = Math.max(0, totalSec - elapsed)
          setTimeLeft(remaining)
          startTimeRef.current = Date.now() - elapsed * 1000
        } else {
          startTimeRef.current = new Date(s.startedAt).getTime()
        }
      })
  }, [sessionId, router])

  // Timer
  useEffect(() => {
    if (!session) return
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    if (session.settings.mode === 'proctored') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!)
            handleSubmit(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // Practice: elapsed counter
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const scheduleAutoSave = useCallback(
    (answers: Record<string, number[]>, flagged: Set<string>, idx: number) => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(() => {
        fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, flagged: Array.from(flagged), currentQuestionIndex: idx }),
        })
      }, 500)
    },
    [sessionId],
  )

  const selectChoice = useCallback(
    (question: Question, idx: number) => {
      if (revealed.has(question.id) && session?.settings.mode === 'practice') return
      setLocalAnswers(prev => {
        let next: Record<string, number[]>
        if (question.isMultiSelect) {
          const cur = prev[question.id] ?? []
          const max = question.correctIndices.length
          if (cur.includes(idx)) {
            next = { ...prev, [question.id]: cur.filter(i => i !== idx) }
          } else if (cur.length < max) {
            next = { ...prev, [question.id]: [...cur, idx] }
          } else {
            next = prev // at max, ignore
          }
        } else {
          next = { ...prev, [question.id]: [idx] }
        }
        scheduleAutoSave(next, localFlagged, currentIdx)
        return next
      })
    },
    [revealed, session?.settings.mode, localFlagged, currentIdx, scheduleAutoSave],
  )

  const toggleFlag = useCallback(
    (qid: string) => {
      setLocalFlagged(prev => {
        const next = new Set(prev)
        if (next.has(qid)) next.delete(qid)
        else next.add(qid)
        scheduleAutoSave(localAnswers, next, currentIdx)
        return next
      })
    },
    [localAnswers, currentIdx, scheduleAutoSave],
  )

  const goTo = useCallback(
    (idx: number) => {
      if (!session) return
      const clamped = Math.max(0, Math.min(session.questions.length - 1, idx))
      setCurrentIdx(clamped)
      scheduleAutoSave(localAnswers, localFlagged, clamped)
    },
    [session, localAnswers, localFlagged, scheduleAutoSave],
  )

  const handleSubmit = useCallback(
    async (skipFinalSave = false) => {
      if (submitting) return
      setSubmitting(true)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)

      // For manual submit: do a final save with current local state.
      // For auto-submit (skipFinalSave=true): skip to avoid stale closure overwriting server state.
      if (!skipFinalSave) {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: localAnswers, flagged: Array.from(localFlagged), currentQuestionIndex: currentIdx }),
        })
      }

      await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeTakenSeconds: timeTaken }),
      })

      router.push(`/results/${sessionId}`)
    },
    [submitting, sessionId, localAnswers, localFlagged, currentIdx, router],
  )

  // Keyboard shortcuts
  useEffect(() => {
    if (!session || loading) return
    const handler = (e: KeyboardEvent) => {
      if (showPreSubmit || showScratchpad) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const q = session.questions[currentIdx]
      if (!q) return

      if (e.key === 'ArrowRight' || e.key === 'n') goTo(currentIdx + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'p') goTo(currentIdx - 1)
      else if (e.key === 'f' || e.key === 'F') toggleFlag(q.id)
      else if (['1', 'a', 'A'].includes(e.key)) selectChoice(q, 0)
      else if (['2', 'b', 'B'].includes(e.key)) selectChoice(q, 1)
      else if (['3', 'c', 'C'].includes(e.key)) selectChoice(q, 2)
      else if (['4', 'd', 'D'].includes(e.key)) selectChoice(q, 3)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session, loading, currentIdx, showPreSubmit, showScratchpad, goTo, toggleFlag, selectChoice])

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading exam…</div>
      </div>
    )
  }

  const questions = session.questions
  const q = questions[currentIdx]
  const mode = session.settings.mode
  const selectedIndices = localAnswers[q?.id ?? ''] ?? []
  const isFlagged = localFlagged.has(q?.id ?? '')
  const isRevealed = revealed.has(q?.id ?? '')

  // Timer appearance
  const isProctored = mode === 'proctored'
  const timerAmber = isProctored && timeLeft < 600
  const timerRed = isProctored && timeLeft < 120
  const timerClass = timerRed
    ? 'text-red-400 font-mono text-lg font-bold timer-pulse'
    : timerAmber
    ? 'text-amber-400 font-mono text-lg font-bold'
    : 'text-slate-200 font-mono text-lg font-bold'

  // Navigator filter
  const filteredIndices = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i: _ }) => {
      if (navFilter === 'unanswered') return (localAnswers[q.id] ?? []).length === 0
      if (navFilter === 'flagged') return localFlagged.has(q.id)
      return true
    })

  const fontSizeClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[fontSize]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Exam Header */}
      <header className="flex-none h-14 bg-slate-900 text-white flex items-center px-4 gap-4 shadow-lg z-40">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">CCAR-F: {session.sourceLabel}</div>
          <div className="text-xs text-slate-400 capitalize">{mode} mode</div>
        </div>

        {/* Timer */}
        {!timerHidden && (
          <div className={timerClass}>
            {isProctored ? formatTime(timeLeft) : `${formatTime(timeLeft)} elapsed`}
          </div>
        )}
        <button
          onClick={() => setTimerHidden(h => !h)}
          className="text-slate-400 hover:text-slate-200 text-xs"
          title="Toggle timer"
        >
          {timerHidden ? 'Show' : 'Hide'}
        </button>

        {/* Font controls */}
        <div className="flex items-center gap-1">
          {(['sm', 'base', 'lg'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                fontSize === s ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'sm' ? 'A−' : s === 'base' ? 'A' : 'A+'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowScratchpad(s => !s)}
          className="text-slate-300 hover:text-white text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
        >
          Scratchpad
        </button>
        <button
          onClick={() => setShowPreSubmit(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
        >
          End Exam
        </button>
      </header>

      {/* Sub-header */}
      <div className="flex-none h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <span className="text-sm text-gray-600">
          Question <span className="font-bold text-gray-900">{currentIdx + 1}</span> of {questions.length}
        </span>
        {mode === 'practice' && q && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${domainColor(q.domain)}`}>
            {q.domain}
          </span>
        )}
        <div className="flex-1" />
        {q && (
          <button
            onClick={() => toggleFlag(q.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded transition-colors ${
              isFlagged
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span>⚑</span> {isFlagged ? 'Flagged' : 'Flag for Review'}
          </button>
        )}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="text-xs text-gray-400 hover:text-gray-600 ml-2"
        >
          {sidebarOpen ? '▶ Hide Nav' : '◀ Show Nav'}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question canvas */}
        <main className="flex-1 overflow-y-auto">
          {q ? (
            <div className={`max-w-3xl mx-auto py-6 px-6 ${fontSizeClass}`}>
              {/* Multi-select badge */}
              {q.isMultiSelect && (
                <div className="mb-3 inline-block bg-amber-100 text-amber-700 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                  Select {q.correctIndices.length} answers
                </div>
              )}
              {!q.isMultiSelect && (
                <div className="mb-3 inline-block bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1 rounded-full">
                  Select one answer
                </div>
              )}

              {/* Stem */}
              <div
                className="exam-html text-gray-900 leading-relaxed mb-5"
                dangerouslySetInnerHTML={{ __html: q.stem }}
              />

              {/* Choices */}
              <div className="space-y-2.5">
                {q.choices.map((_, ci) => (
                  <ChoiceButton
                    key={ci}
                    question={q}
                    choiceIdx={ci}
                    selected={selectedIndices.includes(q.choices[ci]?.idx ?? ci)}
                    revealed={isRevealed}
                    mode={mode}
                    disabled={isRevealed && mode === 'practice'}
                    onSelect={idx => selectChoice(q, idx)}
                  />
                ))}
              </div>

              {/* Practice mode: Check Answer button */}
              {mode === 'practice' && !isRevealed && selectedIndices.length > 0 && (
                <button
                  onClick={() => setRevealed(prev => new Set([...prev, q.id]))}
                  className="mt-5 bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Check Answer
                </button>
              )}

              {/* Practice explanations */}
              {mode === 'practice' && isRevealed && (
                <div className="mt-5">
                  <PracticeExplanations question={q} />
                  {q.keyLearning && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="text-xs font-bold text-amber-700 mb-1.5">💡 Key Learning Point</div>
                      <div className="text-sm text-gray-700 leading-relaxed">{q.keyLearning}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No question found
            </div>
          )}
        </main>

        {/* Navigator sidebar */}
        {sidebarOpen && (
          <aside className="flex-none w-56 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            {/* Filter tabs */}
            <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
              {(['all', 'unanswered', 'flagged'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setNavFilter(f)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    navFilter === f
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Progress */}
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              {Object.values(localAnswers).filter(a => a.length > 0).length}/{questions.length} answered
            </div>

            {/* Question grid */}
            <div className="p-2 grid grid-cols-5 gap-1">
              {filteredIndices.map(({ q: fq, i }) => {
                const isAnswered = (localAnswers[fq.id] ?? []).length > 0
                const isFlaggedQ = localFlagged.has(fq.id)
                const isCurrent = i === currentIdx
                return (
                  <button
                    key={fq.id}
                    onClick={() => goTo(i)}
                    title={`Q${i + 1}: ${fq.domain}`}
                    className={`relative h-8 w-full flex items-center justify-center rounded text-xs font-medium transition-colors border ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300'
                        : isAnswered
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                    {isFlaggedQ && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full transform translate-x-0.5 -translate-y-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom navigation */}
      <footer className="flex-none h-14 bg-white border-t border-gray-200 flex items-center px-4 gap-3">
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={() => {
            if (q) setLocalAnswers(prev => {
              const next = { ...prev, [q.id]: [] }
              scheduleAutoSave(next, localFlagged, currentIdx)
              return next
            })
          }}
          className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
        {q && (
          <button
            onClick={() => toggleFlag(q.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded border text-sm transition-colors ${
              isFlagged
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            ⚑ {isFlagged ? 'Unflag' : 'Flag'}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx === questions.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </footer>

      {/* Pre-submit modal */}
      {showPreSubmit && (
        <PreSubmitReview
          questions={questions}
          answers={localAnswers}
          flagged={localFlagged}
          onClose={() => setShowPreSubmit(false)}
          onSubmit={() => handleSubmit()}
          submitting={submitting}
        />
      )}

      {/* Scratchpad */}
      {showScratchpad && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Scratchpad</span>
            <button onClick={() => setShowScratchpad(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <textarea
            value={scratchpad}
            onChange={e => setScratchpad(e.target.value)}
            placeholder="Quick notes…"
            className="w-full h-40 p-4 text-sm text-gray-700 resize-none focus:outline-none rounded-b-xl"
          />
        </div>
      )}
    </div>
  )
}
