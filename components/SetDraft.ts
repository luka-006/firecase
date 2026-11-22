'use client'
import { useCallback, useSyncExternalStore } from 'react'
import { BUILD_SET_MAX } from '@/lib/set-builder'
import type { SetPartLine } from './CartProvider'

// The set the customer is still putting together. Kept in localStorage so the product page
// and the builder page share it, and so it survives a reload.
const KEY = 'fc_set_draft'
const EVENT = 'fc-set-draft'
const EMPTY: SetPartLine[] = []

let cachedRaw: string | null = null
let cached: SetPartLine[] = EMPTY

function read(): SetPartLine[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cached = Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === 'number' && typeof p.vi === 'number').slice(0, BUILD_SET_MAX) : EMPTY
  } catch {
    cached = EMPTY
  }
  return cached
}

function write(parts: SetPartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(parts))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange()
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useSetDraft() {
  const parts = useSyncExternalStore(subscribe, read, () => EMPTY)
  const add = useCallback((part: SetPartLine) => {
    const now = read()
    if (now.length >= BUILD_SET_MAX) return false
    write([...now, part])
    return true
  }, [])
  const removeAt = useCallback((index: number) => {
    write(read().filter((_, i) => i !== index))
  }, [])
  const removeOne = useCallback((id: number, vi: number) => {
    const now = read()
    const at = now.map((p, i) => ({ p, i })).filter(({ p }) => p.id === id && p.vi === vi).pop()
    if (at) write(now.filter((_, i) => i !== at.i))
  }, [])
  const clear = useCallback(() => write([]), [])
  return { parts, add, removeAt, removeOne, clear }
}

/** Add without the hook, e.g. from a product page button before navigating. */
export function addToSetDraft(part: SetPartLine) {
  const now = read()
  if (now.length >= BUILD_SET_MAX) return false
  write([...now, part])
  return true
}
