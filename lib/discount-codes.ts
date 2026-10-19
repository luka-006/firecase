import 'server-only'
import { sql } from './db'
import { isUniqueViolation } from './invoice/seq'
import { isPromoHeld, isPromoUsable, normalizePromoCode, PROMO_PERCENT, randomPromoCode } from './promo'
import type { DiscountCode, Order } from './types'

export async function issueReviewCode(order: Pick<Order, 'id' | 'email'>): Promise<DiscountCode> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(733205, ${order.id})`
    const existing = await tx<DiscountCode[]>`
      select * from discount_codes where issued_order_id = ${order.id} order by created_at desc`
    const usable = existing.find((row) => isPromoUsable(row) === 'ok')
    if (usable) return usable
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomPromoCode()
      try {
        const [row] = await tx<DiscountCode[]>`
          insert into discount_codes (code, percent, email, issued_order_id, single_use, expires_at)
          values (${code}, ${PROMO_PERCENT}, ${order.email}, ${order.id}, true, now() + interval '60 days')
          returning *`
        if (row) return row
      } catch (e) {
        if (!isUniqueViolation(e) || attempt === 4) throw e
      }
    }
    throw new Error('Ne mogu izdati kod za popust.')
  })
}

export async function findPromo(raw: string): Promise<
  | { ok: true; id: number; code: string; percent: number }
  | { ok: false; reason: 'invalid' | 'used' | 'expired' | 'reserved' }
> {
  const code = normalizePromoCode(raw)
  if (!code) return { ok: false, reason: 'invalid' }
  const [row] = await sql<DiscountCode[]>`select * from discount_codes where code = ${code}`
  if (!row) return { ok: false, reason: 'invalid' }
  const state = isPromoUsable(row)
  if (state !== 'ok') return { ok: false, reason: state }
  if (isPromoHeld(row)) return { ok: false, reason: 'reserved' }
  return { ok: true, id: row.id, code: row.code, percent: row.percent }
}

/** One open checkout may hold the code until its Stripe session expires. */
export async function reservePromo(codeId: number, orderId: number, until: Date) {
  const [row] = await sql<{ id: number }[]>`
    update discount_codes
    set reserved_order_id = ${orderId}, reserved_until = ${until}
    where id = ${codeId}
      and used_at is null
      and expires_at > now()
      and (
        reserved_order_id is null
        or reserved_until is null
        or reserved_until <= now()
        or reserved_order_id = ${orderId}
      )
    returning id`
  return !!row
}

export async function releasePromoReservation(orderId: number) {
  if (!orderId) return
  await sql`
    update discount_codes
    set reserved_order_id = null, reserved_until = null
    where reserved_order_id = ${orderId} and used_at is null`
}

/** Sets used_at only if the code is still free, or already tied to this order. */
export async function markPromoUsed(codeId: number, orderId: number) {
  const [row] = await sql<{ id: number }[]>`
    update discount_codes
    set used_at = coalesce(used_at, now()), used_order_id = coalesce(used_order_id, ${orderId}),
      reserved_order_id = null, reserved_until = null
    where id = ${codeId} and (used_at is null or used_order_id = ${orderId})
    returning id`
  return !!row
}

export async function codesForOrder(orderId: number) {
  return sql<DiscountCode[]>`
    select * from discount_codes
    where issued_order_id = ${orderId} or used_order_id = ${orderId}
    order by created_at`
}
