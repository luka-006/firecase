'use client'
import Image from 'next/image'
import { money } from '@/lib/money'
import type { Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export type UpsellProduct = {
  id: number
  slug: string
  nameHr: string
  nameEn: string
  image: string
  priceCents: number
  vi: number
  variantHr: string
  variantEn: string
}

export function UpsellPopup({
  locale,
  products,
  onAdd,
  onSkip,
}: {
  locale: Locale
  products: UpsellProduct[]
  onAdd: (p: UpsellProduct) => void
  onSkip: () => void
}) {
  const d = t(locale)
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="upsell-title">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 sm:p-8">
        <h2 id="upsell-title" className="h-display text-2xl leading-tight sm:text-3xl">{d.upsellTitle}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {products.map((p) => {
            const name = locale === 'en' && p.nameEn ? p.nameEn : p.nameHr
            return (
              <li key={p.id}>
                <span className="relative block aspect-[4/5] overflow-hidden bg-ink-3">
                  {p.image && <Image src={p.image} alt="" fill sizes="180px" className="object-cover" />}
                </span>
                <span className="mt-2 block text-sm leading-tight">{name}</span>
                <span className="mt-1 block font-mono text-sm tabular-nums">{money(p.priceCents, locale)}</span>
                <button type="button" className="btn btn-sm mt-3 w-full" onClick={() => onAdd(p)}>
                  {d.upsellAdd}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn-ghost mt-6 w-full" onClick={onSkip}>{d.upsellSkip}</button>
      </div>
    </div>
  )
}
