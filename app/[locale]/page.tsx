import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { ArrowIcon, ChevronIcon, ReturnIcon, ShieldIcon, TruckIcon } from '@/components/icons'
import { getActiveProducts } from '@/lib/products'
import { getSettings } from '@/lib/settings'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { alternates: { canonical: locale === 'en' ? '/en' : '/', languages: { hr: '/', en: '/en' } } }
}

function LighterShape({ tall }: { tall?: boolean }) {
  return (
    <svg viewBox="0 0 120 200" className="h-40 w-auto transition duration-700 group-hover:-translate-y-2" aria-hidden>
      <defs>
        <linearGradient id={`m${tall ? 6 : 3}`} x1="0" x2="1"><stop offset="0" stopColor="#222" /><stop offset=".5" stopColor="#56524c" /><stop offset="1" stopColor="#1b1b1b" /></linearGradient>
      </defs>
      <rect x="30" y={tall ? 30 : 70} width="60" height={tall ? 160 : 120} rx="12" fill={`url(#m${tall ? 6 : 3})`} stroke="#6b675f" />
      <path d={`M60 ${tall ? 70 : 100}c-4 9-14 17-14 29 0 9 6 15 14 15s14-6 14-15c0-7-4-11-7-15 0 6-3 9-6 9 3-8 2-16-1-23z`} fill="#d08a2e" />
    </svg>
  )
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const d = t(locale)
  const [products, s] = await Promise.all([getActiveProducts(), getSettings()])
  const featured = products.slice(0, 8)
  const threshold = money(s.freeThresholdCents, locale)

  return (
    <>
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="flicker pointer-events-none absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(208,138,46,0.2),transparent_62%)] md:left-[72%]" />
        <div className="container-x relative grid min-h-[calc(100svh-6rem)] items-center gap-10 py-16 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow">{d.heroEyebrow}</p>
            <h1 className="h-display mt-6 text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-7xl">{d.heroTitle}</h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-bone/65">{d.heroSub}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={href(locale, 'shop')} className="btn group">{d.heroCta}<ArrowIcon className="size-4 transition group-hover:translate-x-0.5" /></Link>
              <a href="#odaberi" className="btn-ghost">{d.heroSecondary}</a>
            </div>
          </div>
          <div className="relative order-first flex justify-center md:order-none">
            <Image src="/logo-mark.svg" alt="" width={187} height={374} priority className="float h-56 w-auto drop-shadow-[0_40px_80px_rgba(208,138,46,0.28)] sm:h-80 lg:h-[420px]" />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-ink-2/50">
        <div className="container-x grid gap-px sm:grid-cols-3">
          {[
            { I: ShieldIcon, h: d.valueFitT, p: d.valueFitD },
            { I: TruckIcon, h: d.valueShipT, p: d.valueShipD(threshold) },
            { I: ReturnIcon, h: d.valueRetT, p: d.valueRetD },
          ].map(({ I, h, p }, i) => (
            <div key={h} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }} className="flex gap-4 py-8 sm:px-6 sm:first:pl-0">
              <I className="size-6 shrink-0 text-flame" />
              <div><p className="text-sm font-medium">{h}</p><p className="mt-1 text-sm leading-relaxed text-mute">{p}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pt-24">
        <div className="mb-10 flex items-end justify-between gap-4" data-reveal>
          <div><p className="eyebrow">{d.featured}</p><h2 className="h-display mt-3 text-2xl sm:text-3xl">{d.allCases}</h2></div>
          <Link href={href(locale, 'shop')} className="hidden text-sm text-mute transition hover:text-bone sm:inline-flex">{d.viewAll} →</Link>
        </div>
        {featured.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {featured.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 2} delay={(i % 4) * 80} />)}
          </div>
        ) : <p className="text-mute">{d.noProducts}</p>}
      </section>

      <section id="odaberi" className="container-x scroll-mt-24 pt-28">
        <div className="mb-10 text-center" data-reveal>
          <h2 className="h-display text-2xl sm:text-3xl">{d.chooseT}</h2>
          <p className="mt-3 text-mute">{d.chooseD}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[{ name: 'BIC J6', desc: d.j6D, tall: true }, { name: 'BIC J3', desc: d.j3D, tall: false }].map((m, i) => (
            <Link key={m.name} href={href(locale, 'shop', undefined, `fits=${encodeURIComponent(m.name)}`)} data-reveal style={{ ['--d' as string]: `${i * 100}ms` }}
              className="group card relative flex items-center justify-between overflow-hidden p-8 transition duration-500 hover:border-flame/40">
              <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(208,138,46,0.14),transparent_70%)] opacity-0 transition duration-700 group-hover:opacity-100" />
              <div>
                <p className="h-display text-3xl">{m.name}</p>
                <p className="mt-2 text-sm text-mute">{m.desc}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm text-bone/80 transition group-hover:text-flame-2">{d.shop} <ArrowIcon className="size-4" /></span>
              </div>
              <LighterShape tall={m.tall} />
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x max-w-3xl pt-28">
        <h2 className="h-display mb-8 text-center text-2xl sm:text-3xl" data-reveal>{d.faqT}</h2>
        <div className="divide-y divide-line border-y border-line">
          {d.faq.map(([q, a]) => (
            <details key={q} className="group py-5" data-reveal>
              <summary className="flex items-center justify-between gap-4 text-[15px]">{q}<ChevronIcon className="size-4 shrink-0 text-mute transition duration-300 group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
