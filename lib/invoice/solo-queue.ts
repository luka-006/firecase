import 'server-only'
import type postgres from 'postgres'
import { sql } from '../db'
import { SOLO_HOURLY_LIMIT, SoloHourlyLimit, hourlyRemaining, pruneHourly } from './retry-policy'

const MIN_GAP_MS = 10_000
const LOCK_KEY = 733102

function asStamps(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((n) => Number(n)).filter((n) => Number.isFinite(n))
}

async function noteSoloRequest(tx: postgres.TransactionSql) {
  await tx`insert into solo_api_guard (id, last_request_at) values (1, '1970-01-01'::timestamptz)
    on conflict (id) do nothing`
  const [row] = await tx<{ recentRequests: unknown; lastRequestAt: Date }[]>`
    select recent_requests, last_request_at from solo_api_guard where id = 1 for update`
  const now = Date.now()
  const stamps = pruneHourly(asStamps(row?.recentRequests), now)
  if (stamps.length >= SOLO_HOURLY_LIMIT) throw new SoloHourlyLimit()
  const last = row?.lastRequestAt ? new Date(row.lastRequestAt).getTime() : 0
  const wait = Math.max(0, MIN_GAP_MS - (now - last))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  const calledAt = Date.now()
  stamps.push(calledAt)
  await tx`update solo_api_guard set last_request_at = ${new Date(calledAt)}, recent_requests = ${tx.json(pruneHourly(stamps, calledAt))} where id = 1`
}

/** One Solo HTTP call per `noteRequest`. Min 10 s apart, and at most SOLO_HOURLY_LIMIT per hour. */
export async function withSoloApiSlot<T>(fn: (tx: postgres.TransactionSql, noteRequest: () => Promise<void>) => Promise<T>): Promise<T> {
  const out = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`
    return fn(tx, () => noteSoloRequest(tx))
  })
  return out as T
}

export async function soloHourlyRemaining() {
  const [row] = await sql<{ recentRequests: unknown }[]>`select recent_requests from solo_api_guard where id = 1`
  return hourlyRemaining(asStamps(row?.recentRequests), Date.now())
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
