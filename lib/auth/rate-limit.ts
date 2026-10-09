import 'server-only'
import { sql } from '../db'

type LimitResult = { ok: true } | { ok: false; retryAfterSec?: number }

/** Jednostavan rate limit / lockout u bazi (serverless-safe). */
export async function checkRateLimit(
  scope: string,
  bucketKey: string,
  opts: { maxHits: number; windowSec: number; lockoutSec?: number },
): Promise<LimitResult> {
  const now = new Date()
  const [row] = await sql<
    { hits: number; windowStart: Date; lockedUntil: Date | null }[]
  >`select hits, window_start, locked_until from auth_rate_limits where scope = ${scope} and bucket_key = ${bucketKey}`
  if (row?.lockedUntil && row.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000) }
  }
  const windowMs = opts.windowSec * 1000
  let hits = row?.hits ?? 0
  let windowStart = row?.windowStart ?? now
  if (now.getTime() - windowStart.getTime() > windowMs) {
    hits = 0
    windowStart = now
  }
  if (hits >= opts.maxHits) {
    const lockedUntil = opts.lockoutSec ? new Date(now.getTime() + opts.lockoutSec * 1000) : null
    await sql`
      insert into auth_rate_limits (scope, bucket_key, hits, window_start, locked_until)
      values (${scope}, ${bucketKey}, ${hits}, ${windowStart}, ${lockedUntil})
      on conflict (scope, bucket_key) do update set
        hits = excluded.hits, window_start = excluded.window_start, locked_until = excluded.locked_until`
    return { ok: false, retryAfterSec: opts.lockoutSec ?? opts.windowSec }
  }
  return { ok: true }
}

export async function hitRateLimit(scope: string, bucketKey: string, opts: { maxHits: number; windowSec: number; lockoutSec?: number }) {
  const now = new Date()
  const [row] = await sql<{ hits: number; windowStart: Date }[]>`
    select hits, window_start from auth_rate_limits where scope = ${scope} and bucket_key = ${bucketKey}`
  const windowMs = opts.windowSec * 1000
  let hits = (row?.hits ?? 0) + 1
  let windowStart = row?.windowStart ?? now
  if (now.getTime() - windowStart.getTime() > windowMs) {
    hits = 1
    windowStart = now
  }
  const lockedUntil =
    hits >= opts.maxHits && opts.lockoutSec ? new Date(now.getTime() + opts.lockoutSec * 1000) : null
  await sql`
    insert into auth_rate_limits (scope, bucket_key, hits, window_start, locked_until)
    values (${scope}, ${bucketKey}, ${hits}, ${windowStart}, ${lockedUntil})
    on conflict (scope, bucket_key) do update set
      hits = excluded.hits, window_start = excluded.window_start, locked_until = excluded.locked_until`
}

export async function clearRateLimit(scope: string, bucketKey: string) {
  await sql`delete from auth_rate_limits where scope = ${scope} and bucket_key = ${bucketKey}`
}
