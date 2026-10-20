import Image from 'next/image'
import Link from 'next/link'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { loc, type Product } from '@/lib/types'
import { t } from '@/lib/dict'
import { isLowStock, isSoldOut } from '@/lib/stock'

export function ProductCard({ p, locale, priority, delay = 0 }: { p: Product; locale: Locale; priority?: boolean; delay?: number }) {
  const d = t(locale)
  const soldOut = isSoldOut(p)
  const low = !soldOut && isLowStock(p)
  const name = loc(p, 'name', locale)
  return (
    <Link href={href(locale, 'product', p.slug)} className="group block min-w-0" data-reveal style={{ ['--d' as string]: `${delay}ms` }}>
      <div className="frame aspect-[4/5]">
        <div className="frame-in">
          <div className="curtain absolute inset-0">
          {p.images[0] && (
            <Image src={p.images[0]} alt={`${name} – ${locale === 'en' ? 'lighter case' : 'futrola za upaljač'}`} fill priority={priority} sizes="(min-width:1024px) 30vw, 50vw"
              className="object-cover transition duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
          )}
          {p.images[1] && (
            <Image src={p.images[1]} alt="" fill sizes="(min-width:1024px) 30vw, 50vw" className="object-cover opacity-0 transition duration-700 group-hover:opacity-100" />
          )}
          </div>
          {soldOut && <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] bg-black/80 px-2 py-1 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-mute sm:left-3 sm:top-3 sm:text-[10px]">{d.outOfStock}</span>}
          {low && <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] border border-flame/70 bg-ink/85 px-1.5 py-1 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-flame sm:left-3 sm:top-3 sm:px-2 sm:text-[10px]">{d.lastPieces}</span>}
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h3 className="h-display min-w-0 text-sm leading-tight [overflow-wrap:anywhere] transition-colors group-hover:text-flame sm:text-base">{name}</h3>
        <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 self-start font-mono text-sm tabular-nums">
          <span className={`whitespace-nowrap ${p.compareCents ? 'text-flame-2' : ''}`}>{money(p.priceCents, locale)}</span>
          {p.compareCents && <span className="whitespace-nowrap text-xs text-mute line-through">{money(p.compareCents, locale)}</span>}
        </div>
      </div>
      {p.variants.length > 0 && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{d.sizes(p.variants.length)}</p>}
    </Link>
  )
}
