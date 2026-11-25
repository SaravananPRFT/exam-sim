import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import type { Question, QuestionSet, Choice, Explanation, Domain } from '@/types/exam'
import { CCAR_F_DOMAINS } from '@/types/exam'

function deriveSetId(filename: string): string {
  const m = filename.match(/Set\s+(\d+)/i)
  if (m) return `set${m[1]}`
  return filename
    .replace(/\.html$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function deriveTitle(filename: string): string {
  const m = filename.match(/Set\s+(\d+)/i)
  if (m) return `Q&A Set ${m[1]}`
  return filename.replace(/\.html$/i, '').trim()
}

function normalizeDomain(raw: string): Domain {
  const trimmed = raw.trim()
  if ((CCAR_F_DOMAINS as readonly string[]).includes(trimmed)) return trimmed as Domain
  // partial prefix match
  for (const d of CCAR_F_DOMAINS) {
    const prefix = d.split(' & ')[0]
    if (trimmed.startsWith(prefix)) return d
  }
  return 'Unknown'
}

export function parseSetFromHtml(html: string, filename: string): { set: QuestionSet; questions: Question[] } {
  const $ = cheerio.load(html)
  const setId = deriveSetId(filename)
  const title = deriveTitle(filename)

  const questions: Question[] = []
  const domainBreakdown: Partial<Record<Domain, number>> = {}

  $('.question-card[data-qnum]').each(function(_, el) {
    const $c = $(el)
    const qnum = parseInt($c.attr('data-qnum') ?? '0', 10)
    if (!qnum) return

    let correctIndices: number[]
    try {
      correctIndices = JSON.parse($c.attr('data-correct') ?? '[0]')
    } catch {
      correctIndices = [0]
    }
    const isMultiSelect = $c.attr('data-multi') === 'true'

    const stem = $c.find('.question-stem').html()?.trim() ?? ''

    const choices: Choice[] = []
    $c.find('.choice-row[data-idx]').each(function(_, row) {
      const $r = $(row)
      const idx = parseInt($r.attr('data-idx') ?? '0', 10)
      const letters = ['A', 'B', 'C', 'D']
      choices.push({
        idx,
        letter: letters[idx] ?? String(idx),
        text: $r.find('.choice-text').html()?.trim() ?? '',
      })
    })

    const explanations: Explanation[] = []
    $c.find('.expl-block[data-idx]').each(function(_, b) {
      const $b = $(b)
      const idx = parseInt($b.attr('data-idx') ?? '0', 10)
      const letters = ['A', 'B', 'C', 'D']
      explanations.push({
        idx,
        letter: letters[idx] ?? String(idx),
        text: $b.find('.expl-text').html()?.trim() ?? '',
      })
    })

    // .text() decodes HTML entities: &amp; → &, so domain names match CCAR_F_DOMAINS
    const klText = $c.find('.key-learning-text').text().trim()
    const domainMatch = /Domain\s+(.+)$/.exec(klText)
    const domain = domainMatch ? normalizeDomain(domainMatch[1]) : 'Unknown'
    const keyLearning = klText
      .replace(/\s*Domain\s+.+$/, '')
      .replace(/\s*Reference:\s*https?:\/\/\S+/g, '')
      .trim()

    domainBreakdown[domain] = (domainBreakdown[domain] ?? 0) + 1

    questions.push({
      id: `${setId}-q${qnum}`,
      setId,
      sourceFile: filename,
      setLabel: title,
      qnum,
      stem,
      choices,
      correctIndices,
      isMultiSelect,
      explanations,
      keyLearning,
      domain,
    })
  })

  const set: QuestionSet = {
    id: setId,
    certId: '',  // stamped by store with the actual certId after parsing
    filename,
    title,
    questionCount: questions.length,
    domainBreakdown,
    parsedAt: new Date().toISOString(),
  }

  return { set, questions }
}

export function parseSetFile(filePath: string): { set: QuestionSet; questions: Question[] } {
  const html = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath)
  return parseSetFromHtml(html, filename)
}

export function parseAllSets(setsDir: string): { sets: QuestionSet[]; questions: Question[] } {
  const files = fs
    .readdirSync(setsDir)
    .filter(f => f.toLowerCase().endsWith('.html'))
    .sort()

  const allSets: QuestionSet[] = []
  const allQuestions: Question[] = []

  for (const file of files) {
    const { set, questions } = parseSetFile(path.join(setsDir, file))
    allSets.push(set)
    allQuestions.push(...questions)
  }

  return { sets: allSets, questions: allQuestions }
}
