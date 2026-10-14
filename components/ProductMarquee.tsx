import Image from 'next/image'
import Link from 'next/link'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { loc, type Product } from '@/lib/types'

export function ProductMarquee({ products, locale }: { products: Product[]; locale: Locale }) {
  if (!products.length) return null
  const cards = (copy: boolean) =>
    products.map((p) => {
      const name = loc(p, 'name', locale)
      return (
        <Link
          key={`${copy ? 'b' : 'a'}-${p.id}`}
          href={href(locale, 'product', p.slug)}
          className="w-44 shrink-0"
          tabIndex={copy ? -1 : undefined}
        >
          <span className="relative block aspect-[4/5] overflow-hidden bg-ink-3">
            {p.images[0] && (
              <Image src={p.images[0]} alt="" fill sizes="176px" className="object-cover" />
            )}
          </span>
          <span className="mt-3 block h-display text-sm leading-tight">{name}</span>
          <span className="mt-1 block font-mono text-sm tabular-nums">{money(p.priceCents, locale)}</span>
        </Link>
      )
    })
  return (
    <div className="marquee mt-16">
      <div className="marquee-track">
        <div className="marquee-group">{cards(false)}</div>
        <div className="marquee-group" aria-hidden="true">
          {cards(true)}
        </div>
      </div>
    </div>
  )
}
