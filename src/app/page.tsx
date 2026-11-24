'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { QuestionSet, ExamMode, AttemptRecord, Certification } from '@/types/exam'
import { useHistory } from '@/lib/useHistory'

type SetWithHistory = QuestionSet & { bestAttempt?: AttemptRecord; attemptCount: number }

function domainPillClass(domain: string): string {
  if (domain.startsWith('Agentic')) return 'bg-blue-100 text-blue-700'
  if (domain.startsWith('Tool')) return 'bg-violet-100 text-violet-700'
  if (domain.startsWith('Claude Code')) return 'bg-emerald-100 text-emerald-700'
  if (domain.startsWith('Prompt')) return 'bg-amber-100 text-amber-700'
  if (domain.startsWith('Context')) return 'bg-cyan-100 text-cyan-700'
  return 'bg-gray-100 text-gray-500'
}

function ScoreBadge({ attempt }: { attempt?: AttemptRecord }) {
  if (!attempt) return <span className="text-xs text-gray-400 italic">Not attempted</span>
  return (
    <div className="text-xs">
      <span className={`font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
        {attempt.scaledScore}/1000 – {attempt.passed ? 'PASS' : 'FAIL'}
      </span>
      <span className="text-gray-400 ml-1">
        {new Date(attempt.submittedAt).toLocaleDateString()}
      </span>
    </div>
  )
}

function SetCard({
  set,
  certId,
  selected,
  onToggle,
  onStart,
}: {
  set: SetWithHistory
  certId: string
  selected: boolean
  onToggle: () => void
  onStart: (mode: ExamMode) => void
}) {
  void certId
  return (
    <div className={`bg-white rounded-lg border-2 p-4 flex flex-col gap-3 transition-colors ${selected ? 'border-indigo-400' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-4 h-4 accent-indigo-600 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{set.title}</div>
            <div className="text-xs text-gray-400 truncate">{set.filename}</div>
          </div>
        </label>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium flex-shrink-0">
          {set.questionCount}Q
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(set.domainBreakdown).map(([d, count]) => (
          <span key={d} className={`text-xs px-2 py-0.5 rounded-full font-medium ${domainPillClass(d)}`}>
            {d.split(' & ')[0].split(' ').slice(0, 2).join(' ')} {count}
          </span>
        ))}
      </div>

      <ScoreBadge attempt={set.bestAttempt} />

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onStart('proctored')}
          className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Proctored
        </button>
        <button
          onClick={() => onStart('practice')}
          className="flex-1 bg-white text-indigo-600 text-xs font-semibold py-2 rounded border border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          Practice
        </button>
      </div>
    </div>
  )
}

function PastAttemptsTab({ attempts }: { attempts: AttemptRecord[] }) {
  const router = useRouter()
  if (attempts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📋</div>
        <div className="font-medium">No attempts yet</div>
        <div className="text-sm mt-1">Start a proctored exam to see your results here.</div>
      </div>
    )
  }
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-3 font-semibold text-gray-600 pr-4">Date</th>
            <th className="pb-3 font-semibold text-gray-600 pr-4">Exam</th>
            <th className="pb-3 font-semibold text-gray-600 pr-4">Mode</th>
            <th className="pb-3 font-semibold text-gray-600 pr-4">Score</th>
            <th className="pb-3 font-semibold text-gray-600 pr-4">Raw</th>
            <th className="pb-3 font-semibold text-gray-600"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(a => (
            <tr key={a.sessionId} className="hover:bg-gray-50">
              <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                {new Date(a.submittedAt).toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-gray-800 font-medium">{a.sourceLabel}</td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.mode === 'proctored' ? 'bg-slate-100 text-slate-700' : 'bg-teal-100 text-teal-700'}`}>
                  {a.mode}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={`font-bold ${a.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {a.scaledScore}/1000
                </span>
                <span className={`ml-1 text-xs font-semibold ${a.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {a.passed ? 'PASS' : 'FAIL'}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-500">
                {a.rawScore}/{a.totalQuestions} ({Math.round((a.rawScore / a.totalQuestions) * 100)}%)
              </td>
              <td className="py-3">
                <button
                  onClick={() => router.push(`/results/${a.sessionId}`)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CERT_COLORS: Record<string, { accent: string; border: string; activeBorder: string; dot: string; label: string }> = {
  indigo:  { accent: 'bg-indigo-500',  border: 'border-indigo-100', activeBorder: 'border-indigo-500', dot: 'bg-indigo-500',  label: 'text-indigo-700' },
  teal:    { accent: 'bg-teal-500',    border: 'border-teal-100',   activeBorder: 'border-teal-500',   dot: 'bg-teal-500',    label: 'text-teal-700'   },
  orange:  { accent: 'bg-orange-500',  border: 'border-orange-100', activeBorder: 'border-orange-500', dot: 'bg-orange-500',  label: 'text-orange-700' },
  violet:  { accent: 'bg-violet-500',  border: 'border-violet-100', activeBorder: 'border-violet-500', dot: 'bg-violet-500',  label: 'text-violet-700' },
  default: { accent: 'bg-gray-400',    border: 'border-gray-200',   activeBorder: 'border-gray-500',   dot: 'bg-gray-500',    label: 'text-gray-700'   },
}

function CertCard({
  cert, active, selectable, totalSets, totalQuestions, bestScore, onSelect,
}: {
  cert: Certification
  active: boolean
  selectable: boolean
  totalSets?: number
  totalQuestions?: number
  bestScore?: { score: number; passed: boolean }
  onSelect: () => void
}) {
  const c = CERT_COLORS[cert.color] ?? CERT_COLORS.default
  const shortId = cert.name.split('–')[0].split('—')[0].trim()
  const subtitle = cert.description || cert.name

  return (
    <button
      onClick={onSelect}
      disabled={!selectable}
      className={`relative group flex flex-col text-left rounded-xl border-2 p-4 pt-5 w-56 flex-shrink-0 bg-white transition-all duration-150
        ${active
          ? `${c.activeBorder} shadow-md`
          : selectable
            ? `${c.border} hover:border-gray-300 hover:shadow-sm`
            : `${c.activeBorder} shadow-md cursor-default`
        }`}
    >
      {/* Coloured top accent bar */}
      <div className={`absolute top-0 inset-x-0 h-1.5 rounded-t-xl ${c.accent}`} />

      {/* Active indicator dot */}
      {active && <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${c.dot}`} />}

      <div className={`text-xl font-black tracking-tight ${active ? c.label : 'text-gray-500 group-hover:text-gray-700'}`}>
        {shortId}
      </div>
      <div className="text-xs text-gray-500 leading-snug mt-0.5 flex-1">
        {subtitle}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2">
        <span className="text-xs text-gray-400">
          {totalSets != null ? `${totalSets} sets · ${totalQuestions}Q` : '—'}
        </span>
        {bestScore ? (
          <span className={`text-xs font-bold ${bestScore.passed ? 'text-green-600' : 'text-red-500'}`}>
            {bestScore.score} {bestScore.passed ? '✓' : '✗'}
          </span>
        ) : (
          <span className="text-xs text-gray-300">Not attempted</span>
        )}
      </div>
    </button>
  )
}

export default function LobbyPage() {
  const router = useRouter()
  const { attempts } = useHistory()

  const [certs, setCerts] = useState<Certification[]>([])
  const [activeCertId, setActiveCertId] = useState<string>('')
  const [rawSets, setRawSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [rescanning, setRescanning] = useState(false)
  const [activeTab, setActiveTab] = useState<'sets' | 'builder' | 'history'>('sets')

  // Builder state
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState(65)
  const [builderMode, setBuilderMode] = useState<ExamMode>('proctored')
  const [randomizeQ, setRandomizeQ] = useState(true)
  const [randomizeO, setRandomizeO] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(120)
  const [generating, setGenerating] = useState(false)

  // Merge sets with best attempt from localStorage
  const sets: SetWithHistory[] = rawSets.map(s => {
    const setAttempts = attempts.filter(a => a.certId === s.certId && a.sourceLabel === s.title)
    const best = setAttempts.sort((a, b) => b.scaledScore - a.scaledScore)[0]
    return { ...s, bestAttempt: best, attemptCount: setAttempts.length }
  })

  // Load certs on mount
  useEffect(() => {
    fetch('/api/certs')
      .then(r => r.json())
      .then(({ certs: c }: { certs: Certification[] }) => {
        setCerts(c)
        if (c.length > 0) setActiveCertId(c[0].id)
      })
  }, [])

  // Load sets when activeCertId changes
  useEffect(() => {
    if (!activeCertId) return
    setLoading(true)
    fetch(`/api/certs/${activeCertId}/sets`)
      .then(r => r.json())
      .then(({ sets: s }: { sets: QuestionSet[] }) => {
        setRawSets(s)
        setSelectedSetIds(new Set())
        setLoading(false)
      })
  }, [activeCertId])

  const handleRescan = async () => {
    if (!activeCertId) return
    setRescanning(true)
    const r = await fetch(`/api/certs/${activeCertId}/sets`, { method: 'POST' })
    const data = await r.json()
    setRawSets(data.sets)
    setRescanning(false)
  }

  const startSingleSet = async (set: SetWithHistory, mode: ExamMode) => {
    const r = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certId: activeCertId,
        setIds: [set.id],
        settings: { mode, randomizeQuestions: false, randomizeOptions: false, timerMinutes: 120 },
        sourceLabel: set.title,
      }),
    })
    const { session } = await r.json()
    router.push(`/exam/${session.id}`)
  }

  const toggleSetSelection = (id: string) => {
    setSelectedSetIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalSelectedQ = sets
    .filter(s => selectedSetIds.has(s.id))
    .reduce((n, s) => n + s.questionCount, 0)

  const handleGenerateExam = async () => {
    if (selectedSetIds.size === 0) return
    setGenerating(true)
    const setIds = Array.from(selectedSetIds)
    const label =
      setIds.length === 1
        ? sets.find(s => s.id === setIds[0])?.title ?? setIds[0]
        : `Custom (${Math.min(questionCount, totalSelectedQ)}Q from ${setIds.length} sets)`
    const r = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certId: activeCertId,
        setIds,
        questionCount: Math.min(questionCount, totalSelectedQ),
        settings: {
          mode: builderMode,
          randomizeQuestions: randomizeQ,
          randomizeOptions: randomizeO,
          timerMinutes,
        },
        sourceLabel: label,
      }),
    })
    const { session } = await r.json()
    router.push(`/exam/${session.id}`)
  }

  const activeCert = certs.find(c => c.id === activeCertId)
  const totalQuestions = sets.reduce((n, s) => n + s.questionCount, 0)

  const tabs = [
    { id: 'sets', label: 'All Sets' },
    { id: 'builder', label: 'Build Custom Exam' },
    { id: 'history', label: `Past Attempts${attempts.length > 0 ? ` (${attempts.length})` : ''}` },
  ] as const

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg tracking-tight">Exam Simulator</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {activeCert ? activeCert.name : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRescan}
              disabled={rescanning || !activeCertId}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {rescanning ? 'Scanning…' : '⟳ Rescan'}
            </button>
            <label className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded cursor-pointer transition-colors">
              ↑ Upload HTML
              <input
                type="file"
                accept=".html"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const fd = new FormData()
                  fd.append('file', file)
                  if (activeCertId) fd.append('certId', activeCertId)
                  await fetch('/api/upload', { method: 'POST', body: fd })
                  handleRescan()
                }}
              />
            </label>
            <button
              onClick={() => router.push('/analytics')}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition-colors"
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      {/* Certification selector strip */}
      {certs.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Certification</span>
              {certs.length === 1 && (
                <span className="text-xs text-gray-300 italic">· add more under <code className="text-gray-400 bg-gray-100 px-1 rounded">data/sets/</code></span>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {certs.map(cert => {
                const certAttempts = attempts.filter(a => a.certId === cert.id)
                const best = certAttempts.sort((a, b) => b.scaledScore - a.scaledScore)[0]
                const certSets = cert.id === activeCertId ? rawSets : undefined
                return (
                  <CertCard
                    key={cert.id}
                    cert={cert}
                    active={cert.id === activeCertId}
                    selectable={certs.length > 1}
                    totalSets={certSets?.length}
                    totalQuestions={certSets?.reduce((n, s) => n + s.questionCount, 0)}
                    bestScore={best ? { score: best.scaledScore, passed: best.passed } : undefined}
                    onSelect={() => setActiveCertId(cert.id)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-sm">Loading question bank…</div>
          </div>
        ) : activeTab === 'sets' ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{totalQuestions}</span> questions across{' '}
                <span className="font-semibold text-gray-800">{sets.length}</span> sets
              </div>
              {selectedSetIds.size > 0 && (
                <div className="text-sm text-indigo-600 font-medium">
                  {selectedSetIds.size} set{selectedSetIds.size > 1 ? 's' : ''} selected ({totalSelectedQ}Q) —{' '}
                  <button onClick={() => setActiveTab('builder')} className="underline">
                    Build Custom Exam →
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sets.map(set => (
                <SetCard
                  key={set.id}
                  set={set}
                  certId={activeCertId}
                  selected={selectedSetIds.has(set.id)}
                  onToggle={() => toggleSetSelection(set.id)}
                  onStart={mode => startSingleSet(set, mode)}
                />
              ))}
            </div>
          </>
        ) : activeTab === 'builder' ? (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Build Custom Exam</h2>

            <section className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Select Sets</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSetIds(new Set(sets.map(s => s.id)))}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSetIds(new Set())}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sets.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSetIds.has(s.id)}
                      onChange={() => toggleSetSelection(s.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-gray-700">{s.title}</span>
                    <span className="text-gray-400 text-xs">({s.questionCount})</span>
                  </label>
                ))}
              </div>
              {selectedSetIds.size > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Pool: {totalSelectedQ} questions from {selectedSetIds.size} set(s)
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5 mb-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Settings</h3>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 w-36">Questions</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(totalSelectedQ, 1)}
                  value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                {selectedSetIds.size > 0 && questionCount > totalSelectedQ && (
                  <span className="text-xs text-amber-600">Pool only has {totalSelectedQ}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 w-36">Mode</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                  {(['proctored', 'practice'] as ExamMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setBuilderMode(m)}
                      className={`px-4 py-1.5 capitalize font-medium transition-colors ${
                        builderMode === m
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {builderMode === 'proctored' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 w-36">Timer (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={timerMinutes}
                    onChange={e => setTimerMinutes(Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQ}
                    onChange={e => setRandomizeQ(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span className="text-gray-700">Randomize question order</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeO}
                    onChange={e => setRandomizeO(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span className="text-gray-700">Randomize option order (A/B/C/D)</span>
                </label>
              </div>
            </section>

            <button
              onClick={handleGenerateExam}
              disabled={selectedSetIds.size === 0 || generating}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating
                ? 'Creating Exam…'
                : selectedSetIds.size === 0
                ? 'Select at least one set'
                : `Generate ${Math.min(questionCount, totalSelectedQ)}Q ${builderMode} exam →`}
            </button>
          </div>
        ) : (
          <PastAttemptsTab attempts={attempts} />
        )}
      </main>
    </div>
  )
}
