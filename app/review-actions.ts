'use server'
import { redirect } from 'next/navigation'
import { readReviewToken } from '@/lib/auth'
import { sql } from '@/lib/db'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import { cleanReviewBody, cleanReviewName, defaultDisplayName, reviewTargets } from '@/lib/review-util'
import { getOrderReviews, insertReviews } from '@/lib/reviews'
import type { Order } from '@/lib/types'

type State = { error?: string; ok?: string } | null
const str = (f: FormData, k: string, max = 5000) => String(f.get(k) ?? '').trim().slice(0, max)

export async function submitReview(_: State, f: FormData): Promise<State> {
  const locale: Locale = str(f, 'locale') === 'en' ? 'en' : 'hr'
  const d = t(locale)
  const token = str(f, 'token', 4000)
  const orderId = await readReviewToken(token)
  if (!orderId) return { error: d.reviewInvalid }

  const [order] = await sql<Order[]>`select * from orders where id = ${orderId}`
  if (!order) return { error: d.reviewInvalid }
  const existing = await getOrderReviews(order.id)
  if (existing.length) return { error: d.reviewAlreadyTitle }
  if (!['shipped', 'delivered'].includes(order.status)) return { error: d.reviewClosed }

  const targets = reviewTargets(order.items)
  if (!targets.length) return { error: d.errors.generic }

  const rows = []
  for (const target of targets) {
    const rating = Number(f.get(`rating_${target.itemIndex}`))
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: d.reviewNeedStars }
    rows.push({
      itemIndex: target.itemIndex,
      productId: target.productId,
      productName: target.name.slice(0, 300),
      variant: target.variant.slice(0, 200),
      rating,
      body: cleanReviewBody(str(f, `body_${target.itemIndex}`, 1000)),
    })
  }
  const displayName = cleanReviewName(str(f, 'displayName', 80)) || defaultDisplayName(order.name) || (locale === 'en' ? 'Customer' : 'Kupac')

  try {
    await insertReviews(order.id, rows, displayName, locale)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'EXISTS' || code === '23505') return { error: d.reviewAlreadyTitle }
    if (code === 'CLOSED') return { error: d.reviewClosed }
    console.error('[review]', (e as Error).message)
    return { error: d.errors.generic }
  }

  redirect(href(locale, 'review', undefined, `t=${encodeURIComponent(token)}&sent=1`))
}
