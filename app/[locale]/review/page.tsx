import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHead } from '@/components/PageHead'
import { ReviewForm } from '@/components/ReviewForm'
import { Stars, formatRating } from '@/components/Stars'
import { readReviewToken } from '@/lib/auth'
import { sql } from '@/lib/db'
import { t } from '@/lib/dict'
import { href, isLocale, type Locale } from '@/lib/routes'
import { defaultDisplayName, reviewTargets } from '@/lib/review-util'
import { getOrderReviews } from '@/lib/reviews'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ t?: string; sent?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const l: Locale = locale === 'en' ? 'en' : 'hr'
  return { title: t(l).reviewPageTitle, robots: { index: false, follow: false } }
}

export default async function ReviewPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale: Locale = raw
  const d = t(locale)
  const sp = await searchParams
  const token = sp.t ?? ''
  const orderId = token ? await readReviewToken(token) : null

  if (!orderId) {
    return (
      <>
        <PageHead title={d.reviewPageTitle} intro={d.reviewInvalid} />
        <div className="container-x pb-24">
          <Link href={href(locale, 'home')} className="link text-sm">{d.backHome}</Link>
        </div>
      </>
    )
  }

  let order: Order | undefined
  try {
    ;[order] = await sql<Order[]>`select * from orders where id = ${orderId}`
  } catch (e) {
    console.error('[review]', (e as Error).message)
    return <PageHead title={d.reviewPageTitle} intro={d.errors.generic} />
  }
  if (!order) {
    return (
      <>
        <PageHead title={d.reviewPageTitle} intro={d.reviewInvalid} />
        <div className="container-x pb-24">
          <Link href={href(locale, 'home')} className="link text-sm">{d.backHome}</Link>
        </div>
      </>
    )
  }

  let existing: Awaited<ReturnType<typeof getOrderReviews>> = []
  try {
    existing = await getOrderReviews(order.id)
  } catch (e) {
    console.error('[review]', (e as Error).message)
    return <PageHead title={d.reviewPageTitle} intro={d.errors.generic} />
  }

  const eyebrow = `${d.orderNo} #${order.orderNumber}`

  if (existing.length) {
    const justSent = sp.sent === '1'
    return (
      <>
        <PageHead eyebrow={eyebrow} title={justSent ? d.reviewThanksTitle : d.reviewAlreadyTitle} />
        <div className="container-x pb-24">
          <div className="max-w-xl">
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {existing.map((r) => (
              <li key={r.id} className="py-5">
                <p className="font-medium">{r.productName}{r.variant ? <span className="text-mute"> · {r.variant}</span> : null}</p>
                <div className="mt-2">
                  <Stars value={r.rating} label={d.reviewOutOf5(formatRating(r.rating))} />
                </div>
                {r.body ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-bone/80">{r.body}</p> : null}
                <p className="mt-2 text-xs text-mute">{r.displayName}</p>
              </li>
            ))}
          </ul>
          <Link href={href(locale, 'home')} className="mt-8 inline-block link text-sm">{d.backHome}</Link>
          </div>
        </div>
      </>
    )
  }

  if (!['shipped', 'delivered'].includes(order.status)) {
    return (
      <>
        <PageHead eyebrow={eyebrow} title={d.reviewPageTitle} intro={d.reviewClosed} />
        <div className="container-x pb-24">
          <Link href={href(locale, 'home')} className="link text-sm">{d.backHome}</Link>
        </div>
      </>
    )
  }

  const targets = reviewTargets(order.items)
  if (!targets.length) {
    return <PageHead eyebrow={eyebrow} title={d.reviewPageTitle} intro={d.errors.generic} />
  }
  return (
    <>
      <PageHead eyebrow={eyebrow} title={d.reviewPageTitle} />
      <div className="container-x pb-24 pt-10">
        <div className="max-w-xl">
          <ReviewForm locale={locale} token={token} targets={targets} defaultName={defaultDisplayName(order.name)} />
        </div>
      </div>
    </>
  )
}
