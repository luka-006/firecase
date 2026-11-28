import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import { withLowStockFirst } from '@/lib/stock'
import { BUILD_SET_MIN, BUILD_SET_TIERS } from '@/lib/set-builder'
import type { Product } from '@/lib/types'

export function ShopCatalogue({
  locale,
  products,
  sort,
  mode,
  engraver,
  builder,
  lead,
  engraverTab = true,
}: {
  locale: Locale
  products: Product[]
  sort?: string
  mode: 'cases' | 'sets' | 'engraver' | 'build'
  /** Engraver tab body: case picker with the live engraving menu, shown instead of the grid. */
  engraver?: React.ReactNode
  /** "Napravi svoj set" tab body, shown instead of the grid. */
  builder?: React.ReactNode
  /** First tile of the grid, e.g. the card that opens the set builder. */
  lead?: React.ReactNode
  /** Shows the Engraver tab; off while no engraving case is published. */
  engraverTab?: boolean
}) {
  const d = t(locale)
  const topPercent = Math.max(0, ...BUILD_SET_TIERS.map((tier) => tier.percent))
  let list = [...products]
  if (sort === 'asc') list.sort((a, b) => a.priceCents - b.priceCents)
  if (sort === 'desc') list.sort((a, b) => b.priceCents - a.priceCents)
  list = withLowStockFirst(list)
  const query = sort ? `sort=${sort}` : undefined
  // Kolekcija lists sets, and single cases too while they are sold on their own; the builder has its own tab.
  const tabs = [
    { href: href(locale, 'shop', undefined, query), label: d.allCases, on: mode === 'cases' || mode === 'sets' },
    { href: href(locale, 'build'), label: d.buildSet, on: mode === 'build', hot: true },
    ...(engraverTab || mode === 'engraver' ? [{ href: href(locale, 'engraver', undefined, query), label: d.engraver, on: mode === 'engraver' }] : []),
  ]
  const page = mode === 'engraver' ? 'engraver' : 'shop'
  const title = mode === 'build' ? d.buildTitle : mode === 'sets' ? d.sets : mode === 'engraver' ? d.engraver : locale === 'en' ? 'Lighter cases' : 'Futrole za upaljače'
  const intro = mode === 'build' ? `${d.buildIntro(BUILD_SET_MIN)} ${d.buildTiers(BUILD_SET_TIERS)}` : mode === 'sets' ? d.setsIntro : mode === 'engraver' ? d.engraverIntro : d.shopIntro
  const countLabel = locale === 'en'
    ? (mode === 'sets' ? 'sets' : 'products')
    : (mode === 'sets' ? 'setova' : mode === 'engraver' ? 'futrola' : 'proizvoda')
  const sorts: [string, string][] = [['', d.sortFeatured], ['asc', d.sortPriceAsc], ['desc', d.sortPriceDesc]]

  return (
    <div className="container-x pt-14">
      <p className="eyebrow">{mode === 'build' ? d.buildSet : mode === 'engraver' ? d.engraver : d.allCases}</p>
      <h1 className="h-display mt-4 text-4xl leading-[1] sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-bone/60">{intro}</p>
      <div role="tablist" aria-label={d.shop} className="mt-10 flex gap-6 border-b border-line">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            role="tab"
            aria-selected={tab.on}
            className={`-mb-px border-b-2 pb-3 font-mono text-[11px] uppercase tracking-[0.18em] transition ${tab.on ? (tab.hot ? 'border-flame text-flame-2' : 'border-bone text-bone') : tab.hot ? 'border-transparent text-flame-2 hover:text-bone' : 'border-transparent text-mute hover:text-bone'}`}
          >
            {tab.label}
            {tab.hot && <span className="ml-2 hidden bg-flame px-1 py-0.5 align-[1px] text-[9px] tracking-[0.08em] text-ink sm:inline">−{topPercent}%</span>}
          </Link>
        ))}
      </div>
      {mode === 'build' && builder ? builder : engraver && list.length ? engraver : (<>
      <div className="mt-5 flex items-center justify-between gap-4 pb-5 font-mono text-[11px] uppercase tracking-[0.18em]">
        <span className="text-mute">{list.length} {countLabel}</span>
        <div className="flex gap-4">
          {sorts.map(([k, label]) => (
            <Link key={k || 'featured'} href={href(locale, page, undefined, k ? `sort=${k}` : undefined)} scroll={false} className={`transition ${(sort ?? '') === k ? 'text-bone' : 'text-mute hover:text-bone'}`}>{label}</Link>
          ))}
        </div>
      </div>
      {list.length || lead ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
          {lead}
          {list.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 4} delay={(i % 4) * 70} />)}
        </div>
      ) : <p className="mt-16 text-center text-mute">{mode === 'sets' ? d.noSets : mode === 'engraver' ? d.noEngravers : d.noProducts}</p>}
      </>)}
    </div>
  )
}
