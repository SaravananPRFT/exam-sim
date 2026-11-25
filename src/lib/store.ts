import fs from 'fs'
import path from 'path'
import type { Question, QuestionSet, ExamSession, Certification } from '@/types/exam'
import { parseAllSets, parseSetFromHtml } from './parser'

const SETS_DIR = path.join(process.cwd(), 'data', 'sets')
const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions')

const KV_ENABLED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
const BLOB_ENABLED = !!(process.env.BLOB_READ_WRITE_TOKEN)

// Lazy-load @vercel/kv only when env vars are present to avoid import errors in local dev
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _kv: any = null
async function getKv() {
  if (!_kv) {
    const mod = await import('@vercel/kv')
    _kv = mod.kv
  }
  return _kv
}

// ── Certification registry ────────────────────────────────────────────────────

const CERT_NAMES: Record<string, { name: string; description: string; color: string }> = {
  'ccar-f':        { name: 'CCAR-F – Foundations',       description: 'Claude Certified Architect – Foundations', color: 'indigo' },
  'ccar-p':        { name: 'CCAR-P – Practitioner',      description: 'Claude Certified Architect – Practitioner', color: 'violet' },
  'cc-developer':  { name: 'CC Developer Associate',     description: 'Claude Certified Developer Associate',      color: 'teal' },
  'ccad-f':        { name: 'CCAD-F – Foundations',       description: 'Claude Certified AI Developer – Foundations', color: 'emerald' },
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

function buildCacheIndex(sets: QuestionSet[], questions: Question[]): QuestionCache {
  const byId = new Map<string, Question>()
  const bySetId = new Map<string, Question[]>()
  for (const q of questions) {
    byId.set(q.id, q)
    if (!bySetId.has(q.setId)) bySetId.set(q.setId, [])
    bySetId.get(q.setId)!.push(q)
  }
  return { sets, questions, byId, bySetId, timestamp: new Date().toISOString() }
}

async function buildCache(certId: string): Promise<QuestionCache> {
  const certDir = path.join(SETS_DIR, certId)
  const diskResult = fs.existsSync(certDir)
    ? parseAllSets(certDir)
    : { sets: [], questions: [] }

  const stampedSets = diskResult.sets.map(s => ({ ...s, certId }))
  let allSets = stampedSets
  let allQuestions = diskResult.questions

  // Fetch blob-stored sets when running on Vercel
  if (BLOB_ENABLED && KV_ENABLED) {
    try {
      const kv = await getKv()
      const blobList = ((await kv.get(`blobs:${certId}`)) ?? []) as Array<{ url: string; filename: string }>
      const blobResults = await Promise.allSettled(
        blobList.map(async ({ url, filename }) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
          const html = await res.text()
          const { set, questions } = parseSetFromHtml(html, filename)
          return { set: { ...set, certId }, questions }
        })
      )
      for (const r of blobResults) {
        if (r.status === 'fulfilled') {
          allSets = [...allSets, r.value.set]
          allQuestions = [...allQuestions, ...r.value.questions]
        }
      }
    } catch {
      // non-fatal: blob sets unavailable, continue with disk sets only
    }
  }

  return buildCacheIndex(allSets, allQuestions)
}

export async function getQuestionCache(certId: string): Promise<QuestionCache> {
  const map = getCacheMap()
  if (!map.has(certId)) map.set(certId, await buildCache(certId))
  return map.get(certId)!
}

export async function rescanSets(certId: string): Promise<QuestionCache> {
  const cache = await buildCache(certId)
  getCacheMap().set(certId, cache)
  return cache
}

export async function getAllSets(certId: string): Promise<QuestionSet[]> {
  return (await getQuestionCache(certId)).sets
}

export async function getAllQuestions(certId: string): Promise<Question[]> {
  return (await getQuestionCache(certId)).questions
}

export async function getQuestionsForSet(certId: string, setId: string): Promise<Question[]> {
  return (await getQuestionCache(certId)).bySetId.get(setId) ?? []
}

export async function getQuestionById(certId: string, id: string): Promise<Question | undefined> {
  return (await getQuestionCache(certId)).byId.get(id)
}

export async function getQuestionsByIds(certId: string, ids: string[]): Promise<Question[]> {
  const cache = await getQuestionCache(certId)
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

export async function saveSession(session: ExamSession): Promise<void> {
  _sessions.set(session.id, session)
  if (KV_ENABLED) {
    const kv = await getKv()
    await kv.set(`session:${session.id}`, session)
    await kv.sadd('sessions:index', session.id)
  }
}

export async function getSession(id: string): Promise<ExamSession | undefined> {
  const mem = _sessions.get(id)
  if (mem) return mem
  if (KV_ENABLED) {
    const kv = await getKv()
    const data = (await kv.get(`session:${id}`)) as ExamSession | null
    if (data) {
      _sessions.set(id, data)
      return data
    }
    return undefined
  }
  const disk = loadSessionFromDisk(id)
  if (disk) {
    _sessions.set(id, disk)
    return disk
  }
  return undefined
}

export async function getAllSessions(): Promise<ExamSession[]> {
  if (KV_ENABLED) {
    const kv = await getKv()
    const ids = ((await kv.smembers('sessions:index')) ?? []) as string[]
    const sessions = await Promise.all(ids.map((id: string) => kv.get(`session:${id}`) as Promise<ExamSession | null>))
    const valid = sessions.filter(Boolean) as ExamSession[]
    for (const s of valid) _sessions.set(s.id, s)
    return valid
  }
  return Array.from(_sessions.values())
}

export async function updateSession(
  id: string,
  updates: Partial<Omit<ExamSession, 'id'>>,
): Promise<boolean> {
  const existing = await getSession(id)
  if (!existing) return false
  const updated = { ...existing, ...updates }
  _sessions.set(id, updated)
  if (KV_ENABLED) {
    const kv = await getKv()
    await kv.set(`session:${id}`, updated)
  }
  return true
}

export async function persistSession(session: ExamSession): Promise<void> {
  if (KV_ENABLED) {
    const kv = await getKv()
    await kv.set(`session:${session.id}`, session)
    await kv.sadd('sessions:index', session.id)
  } else {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
    fs.writeFileSync(sessionFilePath(session.id), JSON.stringify(session), 'utf-8')
  }
}
