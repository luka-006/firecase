import Link from 'next/link'
import type { Metadata } from 'next'
import { CollectionIndex, type IndexItem } from '@/components/CollectionIndex'
import { Mark } from '@/components/Mark'
import { ArrowIcon, PlusIcon } from '@/components/icons'
import { getActiveProducts } from '@/lib/products'
import { getSettings } from '@/lib/settings'
import { SELLER, SITE_URL } from '@/lib/config'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { loc } from '@/lib/types'
import { t } from '@/lib/dict'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  return {
    title: { absolute: en ? 'Firecase – Lighter cases' : 'Firecase – Futrole za upaljače' },
    alternates: { canonical: en ? '/en' : '/', languages: { hr: '/', en: '/en', 'x-default': '/' } },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const d = t(locale)
  const [products, s] = await Promise.all([getActiveProducts(), getSettings()])
  const items: IndexItem[] = products.slice(0, 8).map((p) => ({
    slug: p.slug,
    href: href(locale, 'product', p.slug),
    name: loc(p, 'name', locale),
    short: loc(p, 'short', locale),
    price: money(p.priceCents, locale),
    image: p.images[0] ?? '',
    sizes: p.variants.length ? d.sizes(p.variants.length) : '',
  }))
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Firecase', url: SITE_URL, logo: `${SITE_URL}/icon-512.png`, email: SELLER.email },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Firecase', url: SITE_URL, inLanguage: locale === 'en' ? 'en' : 'hr' },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: d.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ]
  const idx = 'idx mr-3 align-top sm:mr-4'
  const facts: [string, string][] = [
    [d.delivery, d.freeOver(money(s.freeThresholdCents, locale))],
    [d.deliveryTime, locale === 'en' ? s.deliveryEn : s.deliveryHr],
    [d.returnLabel, d.returnValue],
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />

      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="gridlines pointer-events-none absolute inset-0" />
        <Mark outline body="#2c2c2c" className="pointer-events-none absolute -right-[6%] top-[11%] h-[56%] w-auto md:right-[3%] md:top-[9%] md:h-[96%]" />
        <div className="container-x relative flex min-h-[calc(100svh-6.5rem)] flex-col justify-end pb-14 pt-32 md:pb-20">
          <h1 className="md:max-w-[56%]">
            <span className="eyebrow rise block" style={{ ['--d' as string]: '0ms' }}>{d.heroEyebrow}</span>
            <span className="h-display mt-7 block text-[clamp(2.4rem,5.4vw,6rem)] leading-[0.94]">
              <span className="rise block" style={{ ['--d' as string]: '120ms' }}>{d.heroPre}</span>
              <span className="rise block" style={{ ['--d' as string]: '240ms' }}><span className="text-flame">{d.heroEm}</span> {d.heroPost}</span>
            </span>
          </h1>
          <div className="rise mt-12 flex flex-col gap-8 border-t border-line pt-8 md:flex-row md:items-end md:justify-between" style={{ ['--d' as string]: '420ms' }}>
            <p className="max-w-md text-[15px] leading-relaxed text-bone/65">{d.heroSub}</p>
            <Link href={href(locale, 'shop')} className="btn group self-start">{d.heroCta}<ArrowIcon className="size-4 transition duration-500 group-hover:translate-x-1" /></Link>
          </div>
        </div>
      </section>

      <section className="container-x pt-24 md:pt-40" aria-labelledby="kolekcija">
        <div className="mb-10 flex items-end justify-between gap-4" data-reveal>
          <h2 id="kolekcija" className="h-display text-4xl leading-none sm:text-6xl"><span className={idx}>01</span>{d.allCases}</h2>
          <Link href={href(locale, 'shop')} className="hidden items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:text-bone sm:inline-flex">
            {d.viewAll} <ArrowIcon className="size-4" />
          </Link>
        </div>
        {items.length ? (
          <CollectionIndex
            items={items}
            note={
              <dl className="mt-10 divide-y divide-line border-y border-line font-mono text-xs">
                {facts.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 py-4 sm:grid-cols-[10rem_1fr]">
                    <dt className="uppercase tracking-[0.16em] text-mute">{k}</dt>
                    <dd className="text-bone/80">{v}</dd>
                  </div>
                ))}
              </dl>
            }
          />
        ) : <p className="text-mute">{d.noProducts}</p>}
      </section>

      <section className="mt-28 bg-flame text-ink md:mt-44">
        <div className="container-x py-24 md:py-40">
          <p className="h-display max-w-6xl text-[clamp(1.9rem,5vw,4.8rem)] normal-case leading-[1.04]" data-reveal>
            {d.storyA} <span className="opacity-50">{d.storyB}</span>
          </p>
        </div>
      </section>

      <section className="container-x pt-24 md:pt-40" aria-labelledby="faq">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <h2 id="faq" className="h-display text-3xl leading-none sm:text-5xl md:col-span-4 md:sticky md:top-28 md:self-start" data-reveal>
            <span className={idx}>02</span>{d.faqT}
          </h2>
          <div className="divide-y divide-line border-y border-line md:col-span-8">
            {d.faq.map(([q, a], i) => (
              <details key={q} className="group py-6" data-reveal>
                <summary className="flex items-center gap-5 text-base sm:text-lg">
                  <span className="font-mono text-xs text-mute">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{q}</span>
                  <PlusIcon className="size-4 shrink-0 text-mute transition duration-500 group-open:rotate-45" />
                </summary>
                <p className="mt-4 max-w-xl pl-[2.4rem] text-sm leading-relaxed text-bone/60">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
