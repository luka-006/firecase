import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { ArrowIcon, PlusIcon } from '@/components/icons'
import { getActiveProducts } from '@/lib/products'
import { SELLER, SITE_URL } from '@/lib/config'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  return {
    title: { absolute: en ? 'Firecase – Premium lighter cases' : 'Firecase – Premium futrole za upaljače' },
    alternates: { canonical: en ? '/en' : '/', languages: { hr: '/', en: '/en', 'x-default': '/' } },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const d = t(locale)
  const products = await getActiveProducts()
  const featured = products.slice(0, 6)
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Firecase', url: SITE_URL, logo: `${SITE_URL}/icon-512.png`, email: SELLER.email },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Firecase', url: SITE_URL, inLanguage: locale === 'en' ? 'en' : 'hr' },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: d.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />

      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="flicker pointer-events-none absolute right-[-10%] top-[20%] size-[760px] rounded-full bg-[radial-gradient(circle,rgba(208,138,46,0.16),transparent_62%)]" />
        <div className="container-x relative grid min-h-[calc(100svh-6rem)] items-end gap-14 pb-20 pt-16 md:grid-cols-12 md:items-center md:pb-24">
          <div className="md:col-span-7">
            <h1>
              <span className="eyebrow block">{d.heroEyebrow}</span>
              <span className="h-display mt-8 block text-[3rem] leading-[0.98] sm:text-7xl lg:text-[5.6rem]">
                {d.heroPre} <em className="text-flame-2">{d.heroEm}</em> {d.heroPost}
              </span>
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-bone/60">{d.heroSub}</p>
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <Link href={href(locale, 'shop')} className="btn group">{d.heroCta}<ArrowIcon className="size-4 transition duration-500 group-hover:translate-x-1" /></Link>
              <a href="#prica" className="text-[11px] uppercase tracking-[0.22em] text-bone/70 transition hover:text-bone">{d.heroSecondary}</a>
            </div>
          </div>
          <div className="relative hidden md:col-span-5 md:block">
            <div className="relative mx-auto aspect-[3/4] max-w-sm rounded-t-full border border-line">
              <div className="absolute inset-3 rounded-t-full border border-line/60" />
              <Image src="/logo-mark.svg" alt="Firecase" width={187} height={374} priority className="float absolute left-1/2 top-1/2 h-[58%] w-auto -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_40px_80px_rgba(208,138,46,0.25)]" />
            </div>
            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.32em] text-mute">Firecase — N° 01</p>
          </div>
        </div>
        <div className="rule container-x" />
      </section>

      <section id="prica" className="container-x scroll-mt-20 py-28 md:py-40">
        <p className="eyebrow" data-reveal>{d.storyEyebrow}</p>
        <p className="h-display mt-8 max-w-5xl text-4xl leading-[1.1] sm:text-5xl lg:text-[4.2rem]" data-reveal>
          {d.storyA} <span className="italic text-bone/45">{d.storyB}</span>
        </p>
        <div className="mt-20 grid gap-12 border-t border-line pt-12 md:grid-cols-3">
          {d.pillars.map(([h, p], i) => (
            <div key={h} data-reveal style={{ ['--d' as string]: `${i * 110}ms` }}>
              <p className="h-display text-sm text-flame">0{i + 1}</p>
              <p className="h-display mt-4 text-2xl">{h}</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-bone/55">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x">
        <div className="mb-12 flex items-end justify-between gap-4" data-reveal>
          <div>
            <p className="eyebrow">{d.featured}</p>
            <h2 className="h-display mt-4 text-4xl sm:text-5xl">{d.collectionT}</h2>
          </div>
          <Link href={href(locale, 'shop')} className="hidden items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-bone/70 transition hover:text-bone sm:inline-flex">
            {d.viewAll} <ArrowIcon className="size-4" />
          </Link>
        </div>
        {featured.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
            {featured.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 2} delay={(i % 3) * 90} />)}
          </div>
        ) : <p className="text-mute">{d.noProducts}</p>}
      </section>

      <section className="relative mt-32 overflow-hidden border-y border-line py-28 text-center md:mt-44 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(208,138,46,0.12),transparent_65%)]" />
        <p className="h-display relative text-5xl italic sm:text-7xl lg:text-8xl" data-reveal>{d.footerTag}</p>
      </section>

      <section className="container-x max-w-3xl pt-28 md:pt-40">
        <h2 className="h-display mb-10 text-center text-4xl" data-reveal>{d.faqT}</h2>
        <div className="divide-y divide-line border-y border-line">
          {d.faq.map(([q, a]) => (
            <details key={q} className="group py-6" data-reveal>
              <summary className="flex items-center justify-between gap-6 text-[15px]">
                {q}<PlusIcon className="size-4 shrink-0 text-mute transition duration-500 group-open:rotate-45" />
              </summary>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone/55">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
