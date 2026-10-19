import 'server-only'
import { sql } from './db'
import { isUniqueViolation } from './invoice/seq'
import { isPromoUsable, normalizePromoCode, PROMO_PERCENT, randomPromoCode } from './promo'
import type { DiscountCode, Order } from './types'

export async function issueReviewCode(order: Pick<Order, 'id' | 'email'>): Promise<DiscountCode> {
  const [existing] = await sql<DiscountCode[]>`select * from discount_codes where issued_order_id = ${order.id}`
  if (existing) return existing
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomPromoCode()
    try {
      const [row] = await sql<DiscountCode[]>`
        insert into discount_codes (code, percent, email, issued_order_id, single_use, expires_at)
        values (${code}, ${PROMO_PERCENT}, ${order.email}, ${order.id}, true, now() + interval '60 days')
        on conflict (issued_order_id) where issued_order_id is not null do nothing
        returning *`
      if (row) return row
      const [again] = await sql<DiscountCode[]>`select * from discount_codes where issued_order_id = ${order.id}`
      if (again) return again
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 4) throw e
    }
  }
  throw new Error('Ne mogu izdati kod za popust.')
}

export async function findPromo(raw: string): Promise<
  | { ok: true; id: number; code: string; percent: number }
  | { ok: false; reason: 'invalid' | 'used' | 'expired' }
> {
  const code = normalizePromoCode(raw)
  if (!code) return { ok: false, reason: 'invalid' }
  const [row] = await sql<DiscountCode[]>`select * from discount_codes where code = ${code}`
  if (!row) return { ok: false, reason: 'invalid' }
  const state = isPromoUsable(row)
  if (state !== 'ok') return { ok: false, reason: state }
  return { ok: true, id: row.id, code: row.code, percent: row.percent }
}

/** Sets used_at only if the code is still free, or already tied to this order. */
export async function markPromoUsed(codeId: number, orderId: number) {
  const [row] = await sql<{ id: number }[]>`
    update discount_codes
    set used_at = coalesce(used_at, now()), used_order_id = coalesce(used_order_id, ${orderId})
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
