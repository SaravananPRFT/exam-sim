import fs from 'fs'
import path from 'path'
import { parseAllSets } from '../src/lib/parser'

const SETS_DIR = path.join(process.cwd(), 'data', 'sets')

// Auto-detect cert subdirectories
const certIds = fs
  .readdirSync(SETS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

console.log('\n=== Exam Question Bank Verification ===\n')

let totalSets = 0
let totalQuestions = 0
const allIssues: string[] = []

for (const certId of certIds) {
  const certDir = path.join(SETS_DIR, certId)
  const { sets, questions } = parseAllSets(certDir)

  console.log(`── Cert: ${certId.toUpperCase()} (${sets.length} sets, ${questions.length} questions) ──\n`)

  for (const set of sets) {
    const qs = questions.filter(q => q.setId === set.id)
    const withDomain = qs.filter(q => q.domain !== 'Unknown').length
    const multi = qs.filter(q => q.isMultiSelect).length
    console.log(`  [${set.id}] ${set.title}  (${set.filename})`)
    console.log(`    ${qs.length} questions | ${multi} multi-select | ${qs.length - withDomain} unknown-domain`)
    for (const [d, count] of Object.entries(set.domainBreakdown)) {
      console.log(`      ${d}: ${count}`)
    }
    console.log()
  }

  for (const q of questions) {
    if (!q.stem.trim()) allIssues.push(`${certId}/${q.id}: empty stem`)
    if (q.choices.length < 2) allIssues.push(`${certId}/${q.id}: only ${q.choices.length} choices`)
    if (q.correctIndices.length === 0) allIssues.push(`${certId}/${q.id}: no correct indices`)
    for (const ci of q.correctIndices) {
      if (ci < 0 || ci >= q.choices.length) {
        allIssues.push(`${certId}/${q.id}: correctIndex ${ci} out of range (${q.choices.length} choices)`)
      }
    }
    if (q.isMultiSelect && q.correctIndices.length < 2) {
      allIssues.push(`${certId}/${q.id}: marked multi-select but only ${q.correctIndices.length} correct index`)
    }
  }

  totalSets += sets.length
  totalQuestions += questions.length
}

console.log(`Total: ${totalSets} sets, ${totalQuestions} questions across ${certIds.length} cert(s)\n`)

if (allIssues.length > 0) {
  console.error(`⚠  ${allIssues.length} issue(s) found:`)
  for (const i of allIssues) console.error(`   - ${i}`)
  process.exit(1)
} else {
  console.log(`✓  All ${totalQuestions} questions passed validation.\n`)
}
