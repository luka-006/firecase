import { randomBytes } from 'node:crypto'

/** Review-email thank-you. One code, 5% off the product subtotal, 60 days. */
export const PROMO_PERCENT = 5
export const PROMO_DAYS = 60

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_RE = /^FC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

export function normalizePromoCode(raw: string) {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '')
  return CODE_RE.test(code) ? code : ''
}

export function randomPromoCode() {
  const bytes = randomBytes(6)
  let body = ''
  for (let i = 0; i < 6; i++) body += ALPHABET[bytes[i] % ALPHABET.length]
  return `FC-${body}`
}

export function isPromoUsable(row: { usedAt: Date | string | null; expiresAt: Date | string }, now = new Date()) {
  if (row.usedAt) return 'used' as const
  if (new Date(row.expiresAt).getTime() <= now.getTime()) return 'expired' as const
  return 'ok' as const
}
