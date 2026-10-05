import Link from 'next/link'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'en' ? 'Lighter cases – Collection' : 'Futrole za upaljače – Kolekcija',
    description: t(locale as Locale).shopIntro,
    alternates: { canonical: href(locale as Locale, 'shop'), languages: { hr: href('hr', 'shop'), en: href('en', 'shop'), 'x-default': href('hr', 'shop') } },
  }
}

export default async function Shop({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  const d = t(locale)
  const all = await getActiveProducts()
  let list = all
  if (sort === 'asc') list = [...list].sort((a, b) => a.priceCents - b.priceCents)
  if (sort === 'desc') list = [...list].sort((a, b) => b.priceCents - a.priceCents)
  const q = (s?: string) => href(locale, 'shop', undefined, s ? `sort=${s}` : undefined)

  return (
    <div className="container-x pt-14">
      <p className="eyebrow">{d.allCases}</p>
      <h1 className="h-display mt-4 text-5xl sm:text-6xl">{locale === 'en' ? 'Lighter cases' : 'Futrole za upaljače'}</h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-bone/55">{d.shopIntro}</p>
      <div className="mt-10 flex items-center justify-between gap-4 border-b border-line pb-5 text-[11px] uppercase tracking-[0.2em]">
        <span className="text-mute">{list.length} {locale === 'en' ? 'products' : 'proizvoda'}</span>
        <div className="flex gap-4">
          {[['', d.sortFeatured], ['asc', d.sortPriceAsc], ['desc', d.sortPriceDesc]].map(([k, label]) => (
            <Link key={k} href={q(k || undefined)} scroll={false} className={`transition ${(sort ?? '') === k ? 'text-bone' : 'text-mute hover:text-bone'}`}>{label}</Link>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
          {list.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 4} delay={(i % 4) * 70} />)}
        </div>
      ) : <p className="mt-16 text-center text-mute">{d.noProducts}</p>}
    </div>
  )
}
