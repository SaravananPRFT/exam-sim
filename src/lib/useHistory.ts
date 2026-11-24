'use client'
import { useState, useEffect, useCallback } from 'react'
import type { AttemptRecord } from '@/types/exam'

const STORAGE_KEY = 'ccar-exam-history'

function readFromStorage(): AttemptRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AttemptRecord[]) : []
  } catch {
    return []
  }
}

function writeToStorage(records: AttemptRecord[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function useHistory() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])

  useEffect(() => {
    setAttempts(readFromStorage())
  }, [])

  const addAttempt = useCallback((record: AttemptRecord) => {
    setAttempts(prev => {
      const idx = prev.findIndex(a => a.sessionId === record.sessionId)
      const next = idx >= 0
        ? prev.map((a, i) => i === idx ? record : a)
        : [...prev, record]
      writeToStorage(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    writeToStorage([])
    setAttempts([])
  }, [])

  return { attempts, addAttempt, clearHistory }
}

export function addAttemptDirect(record: AttemptRecord): void {
  const existing = readFromStorage()
  const idx = existing.findIndex(a => a.sessionId === record.sessionId)
  const next = idx >= 0
    ? existing.map((a, i) => i === idx ? record : a)
    : [...existing, record]
  writeToStorage(next)
}
