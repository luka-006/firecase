import Image from 'next/image'
import Link from 'next/link'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { loc, type Product } from '@/lib/types'
import { t } from '@/lib/dict'

export function ProductCard({ p, locale, priority, delay = 0 }: { p: Product; locale: Locale; priority?: boolean; delay?: number }) {
  const soldOut = p.stock !== null && p.stock <= 0
  return (
    <Link href={href(locale, 'product', p.slug)} className="group block" data-reveal style={{ ['--d' as string]: `${delay}ms` }}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-line bg-ink-2">
        {p.images[0] && (
          <Image src={p.images[0]} alt={`${loc(p, 'name', locale)} – ${locale === 'en' ? 'lighter case' : 'futrola za upaljač'}`} fill priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.045]" />
        )}
        {p.images[1] && (
          <Image src={p.images[1]} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition duration-700 group-hover:opacity-100" />
        )}
        {soldOut && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-mute">{t(locale).outOfStock}</span>}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="h-display text-lg leading-snug text-bone/90 transition group-hover:text-bone">{loc(p, 'name', locale)}</h3>
        <div className="shrink-0 text-right text-sm tabular-nums">
          <span className={p.compareCents ? 'text-flame-2' : ''}>{money(p.priceCents, locale)}</span>
          {p.compareCents && <span className="ml-2 text-xs text-mute line-through">{money(p.compareCents, locale)}</span>}
        </div>
      </div>
    </Link>
  )
}
