export const CCAR_F_DOMAINS = [
  'Agentic Architecture & Orchestration',
  'Tool Design & MCP Integration',
  'Claude Code Configuration & Workflows',
  'Prompt Engineering & Structured Output',
  'Context Management & Reliability',
] as const

export type Domain = (typeof CCAR_F_DOMAINS)[number] | 'Unknown'

export interface Choice {
  idx: number
  letter: string
  text: string   // inner HTML (may contain <pre><code>)
}

export interface Explanation {
  idx: number
  letter: string
  text: string   // inner HTML
}

export interface Question {
  id: string             // "set1-q1"
  setId: string          // "set1"
  sourceFile: string     // "Study Guide - Q&A Set 1.html"
  setLabel: string       // "Q&A Set 1"
  qnum: number
  stem: string           // inner HTML
  choices: Choice[]
  correctIndices: number[]
  isMultiSelect: boolean
  explanations: Explanation[]
  keyLearning: string    // plain text, domain suffix stripped
  domain: Domain
}

export interface QuestionSet {
  id: string             // "set1"
  certId: string         // "ccar-f" — stamped by store after parsing
  filename: string       // "Study Guide - Q&A Set 1.html"
  title: string          // "Q&A Set 1"
  questionCount: number
  domainBreakdown: Partial<Record<Domain, number>>
  parsedAt: string
}

export interface Certification {
  id: string
  name: string
  description: string
  color: string
}

export type ExamMode = 'proctored' | 'practice'

export interface ExamSettings {
  mode: ExamMode
  randomizeQuestions: boolean
  randomizeOptions: boolean
  timerMinutes: number
}

export interface ExamSession {
  id: string
  certId: string
  setIds: string[]
  sourceLabel: string
  questions: Question[]
  answers: Record<string, number[]>   // questionId → selectedIndices
  flagged: string[]
  currentQuestionIndex: number
  settings: ExamSettings
  startedAt: string
  submittedAt?: string
  result?: ExamResult
}

export interface ExamResult {
  rawScore: number
  totalQuestions: number
  scaledScore: number
  passed: boolean
  domainScores: Record<string, { correct: number; total: number; pct: number }>
  timeTakenSeconds?: number
}

export interface AttemptRecord {
  sessionId: string
  certId: string
  sourceLabel: string
  mode: ExamMode
  submittedAt: string
  scaledScore: number
  passed: boolean
  rawScore: number
  totalQuestions: number
  domainScores: Record<string, { correct: number; total: number; pct: number }>
}
