import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import { withLowStockFirst } from '@/lib/stock'
import type { Product } from '@/lib/types'

export function ShopCatalogue({
  locale,
  products,
  sort,
  mode,
}: {
  locale: Locale
  products: Product[]
  sort?: string
  mode: 'cases' | 'sets'
}) {
  const d = t(locale)
  let list = [...products]
  if (sort === 'asc') list.sort((a, b) => a.priceCents - b.priceCents)
  if (sort === 'desc') list.sort((a, b) => b.priceCents - a.priceCents)
  list = withLowStockFirst(list)
  const query = sort ? `sort=${sort}` : undefined
  const tabs = [
    { href: href(locale, 'shop', undefined, query), label: d.allCases, on: mode === 'cases' },
    { href: href(locale, 'sets', undefined, query), label: d.sets, on: mode === 'sets' },
  ]
  const page = mode === 'sets' ? 'sets' : 'shop'
  const sorts: [string, string][] = [['', d.sortFeatured], ['asc', d.sortPriceAsc], ['desc', d.sortPriceDesc]]

  return (
    <div className="container-x pt-14">
      <p className="eyebrow">{mode === 'sets' ? d.sets : d.allCases}</p>
      <h1 className="h-display mt-4 text-4xl leading-[1] sm:text-6xl">{mode === 'sets' ? d.sets : locale === 'en' ? 'Lighter cases' : 'Futrole za upaljače'}</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-bone/60">{mode === 'sets' ? d.setsIntro : d.shopIntro}</p>
      <div role="tablist" aria-label={d.shop} className="mt-10 flex gap-6 border-b border-line">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            role="tab"
            aria-selected={tab.on}
            className={`-mb-px border-b-2 pb-3 font-mono text-[11px] uppercase tracking-[0.18em] transition ${tab.on ? 'border-bone text-bone' : 'border-transparent text-mute hover:text-bone'}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 pb-5 font-mono text-[11px] uppercase tracking-[0.18em]">
        <span className="text-mute">{list.length} {locale === 'en' ? (mode === 'sets' ? 'sets' : 'products') : (mode === 'sets' ? 'setova' : 'proizvoda')}</span>
        <div className="flex gap-4">
          {sorts.map(([k, label]) => (
            <Link key={k || 'featured'} href={href(locale, page, undefined, k ? `sort=${k}` : undefined)} scroll={false} className={`transition ${(sort ?? '') === k ? 'text-bone' : 'text-mute hover:text-bone'}`}>{label}</Link>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
          {list.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 4} delay={(i % 4) * 70} />)}
        </div>
      ) : <p className="mt-16 text-center text-mute">{mode === 'sets' ? d.noSets : d.noProducts}</p>}
    </div>
  )
}
