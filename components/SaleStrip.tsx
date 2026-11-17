import Image from 'next/image'
import Link from 'next/link'
import { ArrowIcon } from './icons'

export type SaleItem = {
  slug: string
  href: string
  name: string
  short: string
  image: string
  price: string
  compare: string
  /** "Najniža cijena u zadnjih 30 dana: 13,99 €" (Omnibus). */
  lowestLine: string
  /** Badge number, only when the cut is real against the 30-day lowest price. */
  percent: number | null
}

/** Homepage block for discounted products. Renders nothing when nothing is on sale. */
export function SaleStrip({ items, title, badge, index }: { items: SaleItem[]; title: string; badge: string; index: string }) {
  if (!items.length) return null
  return (
    <section className="container-x pt-24 md:pt-40" aria-labelledby="snizeno">
      <div className="mb-10 flex items-end justify-between gap-4" data-reveal>
        <h2 id="snizeno" className="h-display text-4xl leading-none sm:text-6xl">
          <span className="idx mr-3 align-top sm:mr-4">{index}</span>{title}
        </h2>
      </div>
      {/* Phones: a swipeable row. Desktop: a grid. */}
      <ul className={`-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4`}>
        {items.map((it, i) => (
          <li key={it.slug} className={`snap-start ${items.length > 1 ? 'w-[78%] shrink-0 sm:w-auto' : 'w-full'}`} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }}>
            <Link href={it.href} className="group block">
              <span className="frame relative block aspect-square" style={{ ['--c' as string]: '18px' }}>
                <span className="frame-in">
                  {it.image && <Image src={it.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 78vw" className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />}
                </span>
                <span className="sale-tag absolute left-0 top-5 z-10 bg-flame px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
                  {it.percent ? `−${it.percent} %` : badge}
                </span>
              </span>
              <span className="mt-5 flex items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="h-display block text-2xl leading-[1.05] transition-colors duration-300 group-hover:text-flame">{it.name}</span>
                  {it.short && <span className="mt-2 block truncate text-sm text-mute">{it.short}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-lg tabular-nums text-flame-2">{it.price}</span>
                  <span className="block font-mono text-xs tabular-nums text-mute line-through">{it.compare}</span>
                </span>
              </span>
              <span className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
                <span className="text-[11px] leading-snug text-mute">{it.lowestLine}</span>
                <ArrowIcon className="size-4 shrink-0 text-mute transition duration-500 group-hover:translate-x-1 group-hover:text-flame" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
