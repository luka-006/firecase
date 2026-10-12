import Link from 'next/link'
import { Stars, formatRating } from './Stars'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import type { HomeReview, PublicReview } from '@/lib/reviews'

function reviewDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'hr' ? 'hr-HR' : 'en-GB', {
    timeZone: 'Europe/Zagreb',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function ProductReviews({
  locale,
  count,
  average,
  reviews,
}: {
  locale: Locale
  count: number
  average: number
  reviews: PublicReview[]
}) {
  if (count <= 0) return null
  const d = t(locale)
  const avg = formatRating(average)
  return (
    <section id="recenzije" className="scroll-mt-28 pt-20 md:pt-28" aria-labelledby="recenzije-naslov">
      <h2 id="recenzije-naslov" className="h-display text-3xl leading-none sm:text-4xl">{d.reviewsHeading}</h2>
      <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <Stars value={average} label={d.reviewOutOf5(avg)} />
        <span className="font-mono text-xs text-mute">{avg} · {d.reviewCount(count)}</span>
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {reviews.map((r) => (
          <li key={r.id} className="py-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars value={r.rating} className="size-3.5" label={d.reviewOutOf5(formatRating(r.rating))} />
              <span className="text-sm">{r.displayName}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{reviewDate(r.createdAt, locale)}</span>
            </div>
            {r.variant ? <p className="mt-2 text-xs text-mute">{r.variant}</p> : null}
            {r.body ? <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-bone/80">{r.body}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ReviewsStrip({ locale, reviews }: { locale: Locale; reviews: HomeReview[] }) {
  if (!reviews.length) return null
  const d = t(locale)
  return (
    <section className="border-y border-line" aria-labelledby="recenzije-home">
      <div className="container-x grid gap-6 py-8 md:grid-cols-[13rem_1fr] md:items-start md:gap-10 md:py-10">
        <div>
          <h2 id="recenzije-home" className="eyebrow">{d.reviewsHeading}</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const name = locale === 'en' && r.nameEn ? r.nameEn : r.nameHr
            return (
              <li key={r.id} className="border border-line p-5">
                <Stars value={r.rating} className="size-3.5" label={d.reviewOutOf5(formatRating(r.rating))} />
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-bone/80">{r.body}</p>
                <p className="mt-4 text-xs text-mute">
                  <span className="text-bone/80">{r.displayName}</span>
                  {' · '}
                  <Link href={href(locale, 'product', r.productSlug)} className="link">{name}</Link>
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
