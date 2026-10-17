/** Solo allows 100 requests / 60 min and returns 429 after that. Stay well under. */
export const SOLO_HOURLY_LIMIT = 40
export const SOLO_HOUR_MS = 60 * 60 * 1000

/** After this many failed sends, only the admin button may try again. */
export const MAX_AUTO_ATTEMPTS = 5

const BACKOFF_BASE_MS = 2 * 60 * 1000
const BACKOFF_CAP_MS = 6 * SOLO_HOUR_MS
const RATE_LIMIT_FLOOR_MS = 15 * 60 * 1000

export const AUTH_COOLDOWN_MS = SOLO_HOUR_MS

export class SoloHourlyLimit extends Error {
  constructor() {
    super('Solo satni limit je dosegnut. Sljedeći automatski pokušaj ide kad se satni prozor oslobodi.')
    this.name = 'SoloHourlyLimit'
  }
}

/** Delay after `attempts` failed sends. 2 min, 4, 8, 16… capped at 6 h. */
export function backoffMs(attempts: number) {
  const n = Math.max(1, attempts)
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (n - 1))
}

export function isSoloAuthError(message: string, status?: number) {
  if (status === 101) return true
  return /neispravan token/i.test(message)
}

export function isSoloRateLimit(message: string, httpStatus?: number, soloStatus?: number) {
  if (httpStatus === 429 || soloStatus === 429) return true
  return /\b429\b|previše zahtjeva|too many requests/i.test(message)
}

/** How long to wait after the last failed attempt before an automatic retry. */
export function retryWaitMs(attempts: number, error: string | null) {
  const base = backoffMs(Math.max(1, attempts))
  if (error && isSoloAuthError(error)) return Math.max(base, AUTH_COOLDOWN_MS)
  if (error && isSoloRateLimit(error)) return Math.max(base, RATE_LIMIT_FLOOR_MS)
  return base
}

export type AutoRetryInput = {
  now: number
  attempts: number
  lastAttemptAt: number | null
  fiscalError: string | null
  /** Admin "Ponovno izdaj račun" skips backoff and the attempt cap. */
  manual?: boolean
}

export function autoRetryDecision(input: AutoRetryInput): { allow: boolean; reason?: 'max_attempts' | 'backoff' | 'auth_cooldown' } {
  if (input.manual) return { allow: true }
  if (!input.lastAttemptAt || input.attempts <= 0) return { allow: true }
  if (input.attempts >= MAX_AUTO_ATTEMPTS) return { allow: false, reason: 'max_attempts' }
  const wait = retryWaitMs(input.attempts, input.fiscalError)
  if (input.now - input.lastAttemptAt < wait) {
    return { allow: false, reason: input.fiscalError && isSoloAuthError(input.fiscalError) ? 'auth_cooldown' : 'backoff' }
  }
  return { allow: true }
}

export function pruneHourly(stamps: number[], now: number) {
  return stamps.filter((t) => now - t < SOLO_HOUR_MS && now - t >= 0)
}

export function hourlyRemaining(stamps: number[], now: number) {
  return Math.max(0, SOLO_HOURLY_LIMIT - pruneHourly(stamps, now).length)
}
