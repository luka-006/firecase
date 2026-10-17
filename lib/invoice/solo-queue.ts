import 'server-only'
import type postgres from 'postgres'
import { sql } from '../db'

const MIN_GAP_MS = 10_000
const LOCK_KEY = 733102

/** Globalni red za Solo API (min. 10 s između zahtjeva). Zaključavanje drži se dok `fn` ne završi. */
export async function withSoloApiSlot<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  const out = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`
    await tx`insert into solo_api_guard (id, last_request_at) values (1, '1970-01-01'::timestamptz)
      on conflict (id) do nothing`
    const [row] = await tx<{ lastRequestAt: Date }[]>`select last_request_at from solo_api_guard where id = 1`
    const last = row?.lastRequestAt ? new Date(row.lastRequestAt).getTime() : 0
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - last))
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    const result = await fn(tx)
    await tx`update solo_api_guard set last_request_at = now() where id = 1`
    return result
  })
  return out as T
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
