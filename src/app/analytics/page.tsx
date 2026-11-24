'use client'
import { useRouter } from 'next/navigation'
import type { AttemptRecord } from '@/types/exam'
import { useHistory } from '@/lib/useHistory'

export default function AnalyticsPage() {
  const router = useRouter()
  const { attempts, clearHistory } = useHistory()

  const sorted = [...attempts].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )

  const passCount = attempts.filter(a => a.passed).length
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + a.scaledScore, 0) / attempts.length)
      : 0

  const domainMap: Record<string, { correct: number; total: number }> = {}
  for (const a of attempts) {
    for (const [d, scores] of Object.entries(a.domainScores ?? {})) {
      if (!domainMap[d]) domainMap[d] = { correct: 0, total: 0 }
      domainMap[d].correct += scores.correct
      domainMap[d].total += scores.total
    }
  }

  // Group by cert
  const certIds = [...new Set(attempts.map((a: AttemptRecord) => a.certId).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white text-sm">← Lobby</button>
        <h1 className="font-bold flex-1">Past Attempts & Analytics</h1>
        {attempts.length > 0 && (
          <button
            onClick={() => { if (confirm('Clear all attempt history from this browser?')) clearHistory() }}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-3 py-1.5 rounded"
          >
            Clear History
          </button>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {attempts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <div className="font-semibold text-lg">No attempts recorded yet</div>
            <div className="text-sm mt-2">Your history is stored in this browser only.</div>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Attempts', value: attempts.length },
                { label: 'Pass Rate', value: `${Math.round((passCount / attempts.length) * 100)}%` },
                { label: 'Avg Scaled Score', value: avgScore },
                { label: 'Best Score', value: Math.max(...attempts.map(a => a.scaledScore)) },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Domain breakdown aggregate */}
            {Object.keys(domainMap).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Cumulative Domain Performance</h2>
                <div className="space-y-3">
                  {Object.entries(domainMap)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([d, { correct, total }]) => {
                      const pct = total > 0 ? Math.round((correct / total) * 100) : 0
                      return (
                        <div key={d}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{d}</span>
                            <span className={`font-semibold ${pct >= 72 ? 'text-green-600' : 'text-red-600'}`}>
                              {correct}/{total} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 72 ? 'bg-green-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Attempts table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">All Attempts</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-gray-500 font-semibold pr-4">Date</th>
                    {certIds.length > 1 && <th className="pb-3 text-gray-500 font-semibold pr-4">Cert</th>}
                    <th className="pb-3 text-gray-500 font-semibold pr-4">Exam</th>
                    <th className="pb-3 text-gray-500 font-semibold pr-4">Mode</th>
                    <th className="pb-3 text-gray-500 font-semibold pr-4">Score</th>
                    <th className="pb-3 text-gray-500 font-semibold pr-4">Raw</th>
                    <th className="pb-3 text-gray-500 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map(a => (
                    <tr key={a.sessionId} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(a.submittedAt).toLocaleString()}
                      </td>
                      {certIds.length > 1 && (
                        <td className="py-3 pr-4 text-xs text-gray-500 uppercase font-mono">{a.certId}</td>
                      )}
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
                      <td className="py-3 pr-4 text-gray-500 text-xs">
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
          </>
        )}

        <p className="text-center text-xs text-gray-400">
          History is stored in this browser only. Colleagues using the same URL have their own private history.
        </p>
      </div>
    </div>
  )
}
