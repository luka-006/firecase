import 'server-only'
import { SITE_URL } from './config'
import { sql } from './db'
import { issueReviewCode } from './discount-codes'
import { sendReviewRequest } from './mail'
import { href, type Locale } from './routes'
import { signReviewToken } from './auth'
import type { Order } from './types'
import type { SendMailResult } from './mail/send'

export const REVIEW_AFTER_DAYS = 14

export async function reviewPathForOrder(orderId: number, locale: Locale) {
  const token = await signReviewToken(orderId)
  return href(locale, 'review', undefined, `t=${encodeURIComponent(token)}`)
}

export async function sendReviewRequestEmail(order: Order): Promise<SendMailResult> {
  const locale: Locale = order.locale === 'en' ? 'en' : 'hr'
  const path = await reviewPathForOrder(order.id, locale)
  const promo = await issueReviewCode(order)
  return sendReviewRequest(order, `${SITE_URL}${path}`, promo.code)
}

/** Ručno iz admina (i prije 14 dana). Uspjeh se pamti da cron ne pošalje drugi put. */
export async function deliverReviewRequest(order: Order, opts?: { force?: boolean }): Promise<SendMailResult> {
  if (!['shipped', 'delivered'].includes(order.status)) {
    return { ok: false, error: 'Narudžba nije poslana.' }
  }
  if (!opts?.force && order.reviewRequestSentAt) {
    return { ok: false, error: 'Zahtjev je već poslan.' }
  }
  if (!order.email.includes('@')) return { ok: false, error: 'Nema e-maila kupca.' }
  const result = await sendReviewRequestEmail(order)
  if (result.ok) {
    await sql`update orders set review_request_sent_at = now(), review_request_error = null where id = ${order.id}`
  } else {
    await sql`update orders set review_request_error = ${result.error.slice(0, 500)} where id = ${order.id}`
  }
  return result
}

/** Jedan zahtjev po narudžbi, 14 dana nakon shipped_at. Neuspjeh se ponovi sljedeći dan. */
export async function sendDueReviewRequests(limit = 20) {
  const due = await sql<Order[]>`
    select * from orders
    where status in ('shipped', 'delivered')
      and shipped_at is not null
      and shipped_at <= now() - interval '14 days'
      and review_request_sent_at is null
    order by shipped_at
    limit ${limit}`
  let sent = 0
  let failed = 0
  for (const order of due) {
    const [claimed] = await sql<{ id: number }[]>`
      update orders set review_request_sent_at = now()
      where id = ${order.id} and review_request_sent_at is null
      returning id`
    if (!claimed) continue
    try {
      const result = await sendReviewRequestEmail(order)
      if (!result.ok) throw new Error(result.error)
      sent++
      await sql`update orders set review_request_error = null where id = ${order.id}`
    } catch (e) {
      failed++
      const msg = (e as Error).message.slice(0, 500)
      console.error('[reviews]', order.id, msg)
      await sql`update orders set review_request_sent_at = null, review_request_error = ${msg} where id = ${order.id}`
    }
  }
  return { sent, failed, checked: due.length }
}
