import { NextResponse } from 'next/server'
import { getQuestionsForSet, getAllQuestions } from '@/lib/store'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ certId: string; setId: string }> },
) {
  const { certId, setId } = await params
  const questions = setId === 'all'
    ? getAllQuestions(certId)
    : getQuestionsForSet(certId, setId)
  return NextResponse.json({ questions })
}
