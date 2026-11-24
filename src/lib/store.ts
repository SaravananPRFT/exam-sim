import fs from 'fs'
import path from 'path'
import type { Question, QuestionSet, ExamSession, Certification } from '@/types/exam'
import { parseAllSets } from './parser'

const SETS_DIR = path.join(process.cwd(), 'data', 'sets')
const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions')

// ── Certification registry ────────────────────────────────────────────────────

const CERT_NAMES: Record<string, { name: string; description: string; color: string }> = {
  'ccar-f':        { name: 'CCAR-F – Foundations',       description: 'Claude Certified Architect – Foundations', color: 'indigo' },
  'ccar-p':        { name: 'CCAR-P – Practitioner',      description: 'Claude Certified Architect – Practitioner', color: 'violet' },
  'cc-developer':  { name: 'CC Developer Associate',     description: 'Claude Certified Developer Associate',      color: 'teal' },
}

export function getCerts(): Certification[] {
  if (!fs.existsSync(SETS_DIR)) return []
  return fs
    .readdirSync(SETS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const info = CERT_NAMES[d.name]
      return {
        id: d.name,
        name: info?.name ?? d.name.toUpperCase(),
        description: info?.description ?? '',
        color: info?.color ?? 'gray',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Question / Set cache (per cert) ──────────────────────────────────────────

interface QuestionCache {
  sets: QuestionSet[]
  questions: Question[]
  byId: Map<string, Question>
  bySetId: Map<string, Question[]>
  timestamp: string
}

declare global {
  // eslint-disable-next-line no-var
  var __examQCaches: Map<string, QuestionCache> | undefined
}

function getCacheMap(): Map<string, QuestionCache> {
  if (!globalThis.__examQCaches) globalThis.__examQCaches = new Map()
  return globalThis.__examQCaches
}

function buildCache(certId: string): QuestionCache {
  const certDir = path.join(SETS_DIR, certId)
  const { sets, questions } = parseAllSets(certDir)
  // stamp certId onto every set
  const stampedSets = sets.map(s => ({ ...s, certId }))
  const byId = new Map<string, Question>()
  const bySetId = new Map<string, Question[]>()
  for (const q of questions) {
    byId.set(q.id, q)
    if (!bySetId.has(q.setId)) bySetId.set(q.setId, [])
    bySetId.get(q.setId)!.push(q)
  }
  return { sets: stampedSets, questions, byId, bySetId, timestamp: new Date().toISOString() }
}

export function getQuestionCache(certId: string): QuestionCache {
  const map = getCacheMap()
  if (!map.has(certId)) map.set(certId, buildCache(certId))
  return map.get(certId)!
}

export function rescanSets(certId: string): QuestionCache {
  const cache = buildCache(certId)
  getCacheMap().set(certId, cache)
  return cache
}

export function getAllSets(certId: string): QuestionSet[] {
  return getQuestionCache(certId).sets
}

export function getAllQuestions(certId: string): Question[] {
  return getQuestionCache(certId).questions
}

export function getQuestionsForSet(certId: string, setId: string): Question[] {
  return getQuestionCache(certId).bySetId.get(setId) ?? []
}

export function getQuestionById(certId: string, id: string): Question | undefined {
  return getQuestionCache(certId).byId.get(id)
}

export function getQuestionsByIds(certId: string, ids: string[]): Question[] {
  const cache = getQuestionCache(certId)
  return ids.flatMap(id => {
    const q = cache.byId.get(id)
    return q ? [q] : []
  })
}

// ── Session store ─────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __examSessions: Map<string, ExamSession> | undefined
}

const _sessions: Map<string, ExamSession> =
  globalThis.__examSessions ?? (globalThis.__examSessions = new Map())

function sessionFilePath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`)
}

function loadSessionFromDisk(id: string): ExamSession | undefined {
  try {
    const p = sessionFilePath(id)
    if (!fs.existsSync(p)) return undefined
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as ExamSession
  } catch {
    return undefined
  }
}

export function persistSession(session: ExamSession): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  fs.writeFileSync(sessionFilePath(session.id), JSON.stringify(session), 'utf-8')
}

export function getSession(id: string): ExamSession | undefined {
  const mem = _sessions.get(id)
  if (mem) return mem
  const disk = loadSessionFromDisk(id)
  if (disk) {
    _sessions.set(id, disk)
    return disk
  }
  return undefined
}

export function getAllSessions(): ExamSession[] {
  return Array.from(_sessions.values())
}

export function saveSession(session: ExamSession): void {
  _sessions.set(session.id, session)
}

export function updateSession(
  id: string,
  updates: Partial<Omit<ExamSession, 'id'>>,
): boolean {
  const existing = _sessions.get(id)
  if (!existing) return false
  const updated = { ...existing, ...updates }
  _sessions.set(id, updated)
  if (updated.submittedAt) persistSession(updated)
  return true
}
