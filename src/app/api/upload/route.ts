import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'
import { rescanSets, getCerts } from '@/lib/store'

const SETS_DIR = path.join(process.cwd(), 'data', 'sets')

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const certId = (formData.get('certId') as string | null) ?? 'ccar-f'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const originalName = file.name
  if (!originalName.toLowerCase().endsWith('.html')) {
    return NextResponse.json({ error: 'Only .html files are supported' }, { status: 400 })
  }

  const safeName = path.basename(originalName)
  const content = await file.text()

  const $ = cheerio.load(content)
  const questionCount = $('.question-card[data-qnum]').length
  if (questionCount < 5) {
    return NextResponse.json(
      { error: 'File does not appear to contain exam questions (< 5 found)' },
      { status: 400 },
    )
  }

  const certDir = path.join(SETS_DIR, certId)
  fs.mkdirSync(certDir, { recursive: true })
  fs.writeFileSync(path.join(certDir, safeName), content, 'utf-8')

  const cache = rescanSets(certId)

  return NextResponse.json({
    savedAs: safeName,
    certId,
    questionCount,
    totalSets: cache.sets.length,
  })
}
