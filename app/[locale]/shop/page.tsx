import Link from 'next/link'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ fits?: string; sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'en' ? 'Shop' : 'Trgovina',
    alternates: { canonical: href(locale as Locale, 'shop'), languages: { hr: href('hr', 'shop'), en: href('en', 'shop') } },
  }
}

export default async function Shop({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { fits, sort } = await searchParams
  const d = t(locale)
  const all = await getActiveProducts()
  const models = [...new Set(all.map((p) => p.fits).filter(Boolean))].sort()
  let list = fits ? all.filter((p) => p.fits === fits) : all
  if (sort === 'asc') list = [...list].sort((a, b) => a.priceCents - b.priceCents)
  if (sort === 'desc') list = [...list].sort((a, b) => b.priceCents - a.priceCents)
  const q = (o: { fits?: string; sort?: string }) => {
    const sp = new URLSearchParams()
    if (o.fits) sp.set('fits', o.fits)
    if (o.sort) sp.set('sort', o.sort)
    return href(locale, 'shop', undefined, sp.toString() || undefined)
  }
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-xs tracking-wide transition ${active ? 'border-bone bg-bone text-ink' : 'border-line text-bone/70 hover:border-bone/40 hover:text-bone'}`

  return (
    <div className="container-x pt-14">
      <h1 className="h-display text-3xl sm:text-4xl">{fits || d.allCases}</h1>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex flex-wrap gap-2">
          <Link href={q({ sort })} className={chip(!fits)} scroll={false}>{d.all}</Link>
          {models.map((m) => <Link key={m} href={q({ fits: m, sort })} className={chip(fits === m)} scroll={false}>{m}</Link>)}
        </div>
        <div className="flex gap-2 text-xs">
          {[['', d.sortFeatured], ['asc', d.sortPriceAsc], ['desc', d.sortPriceDesc]].map(([k, label]) => (
            <Link key={k} href={q({ fits, sort: k || undefined })} scroll={false} className={`px-2 py-1 transition ${(sort ?? '') === k ? 'text-bone' : 'text-mute hover:text-bone'}`}>{label}</Link>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 4} delay={(i % 4) * 70} />)}
        </div>
      ) : <p className="mt-16 text-center text-mute">{d.noProducts}</p>}
    </div>
  )
}
