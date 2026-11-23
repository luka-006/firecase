'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCart, type CartItem } from './CartProvider'
import { MinusIcon, PlusIcon, XIcon } from './icons'
import { cartHasFreeShipping } from '@/lib/setovi'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function FreeShippingBar({ locale }: { locale: Locale }) {
  const { items, subtotal, shipping } = useCart()
  const d = t(locale)
  const waived = cartHasFreeShipping(items)
  const left = waived ? 0 : shipping.freeThresholdCents - subtotal
  const pct = waived || shipping.freeThresholdCents <= 0 ? 100 : Math.min(100, (subtotal / shipping.freeThresholdCents) * 100)
  return (
    <div>
      <p className="mb-2 text-xs text-mute">{left > 0 ? d.freeLeft(money(left, locale)) : d.freeReached}</p>
      <div className="h-1 overflow-hidden rounded-none bg-line">
        <div className="h-full rounded-none bg-gradient-to-r from-flame to-flame-2 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Cases inside a built set, one short line under the set name. */
export function SetPartsText({ item, locale }: { item: CartItem; locale: Locale }) {
  if (!item.parts?.length) return null
  const d = t(locale)
  return (
    <span className="mt-0.5 block space-y-0.5 text-xs text-mute">
      {item.parts.map((p, i) => {
        const name = locale === 'en' && p.nameEn ? p.nameEn : p.nameHr
        const variant = locale === 'en' && p.variantEn ? p.variantEn : p.variantHr
        return <span key={`${p.id}-${p.vi}-${i}`} className="block truncate">{variant ? `${name} · ${variant}` : name}</span>
      })}
      {item.setPercent ? <span className="block text-flame">{d.buildDiscount(item.setPercent)}</span> : null}
    </span>
  )
}

/** Built set: its case photos in one square (up to four, then "+N"), each shown whole. */
export function SetThumb({ item }: { item: CartItem }) {
  const parts = item.parts ?? []
  const shown = parts.length > 4 ? parts.slice(0, 3) : parts.slice(0, 4)
  const more = parts.length - shown.length
  const cells = shown.length + (more > 0 ? 1 : 0)
  return (
    <span className={`absolute inset-0 grid gap-px bg-line ${cells <= 2 ? 'grid-rows-1' : 'grid-rows-2'} ${cells <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {shown.map((p, i) => (
        <span key={`${p.id}-${p.vi}-${i}`} className="relative overflow-hidden bg-ink-3">
          {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain" />}
        </span>
      ))}
      {more > 0 && <span className="grid place-items-center bg-ink-3 font-mono text-[11px] tabular-nums text-bone/80">+{more}</span>}
      {cells === 3 && <span className="bg-ink-3" />}
    </span>
  )
}

export function CartLines({ locale, compact }: { locale: Locale; compact?: boolean }) {
  const { items, setQty, remove, setOpen } = useCart()
  const d = t(locale)
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => (
        <li key={i.key} className="flex gap-4 py-4">
          <Link href={i.parts?.length ? href(locale, 'build') : href(locale, 'product', i.slug)} onClick={() => setOpen(false)} className={`relative shrink-0 overflow-hidden rounded-sm bg-ink-3 ${compact ? 'size-20' : 'size-24'}`}>
            {i.parts?.length ? <SetThumb item={i} /> : i.image && <Image src={i.image} alt="" fill sizes="96px" className="object-contain" />}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{locale === 'en' && i.nameEn ? i.nameEn : i.nameHr}</p>
                {i.vi >= 0 && <p className="text-xs text-mute">{locale === 'en' && i.variantEn ? i.variantEn : i.variantHr}</p>}
                {i.engraving && <p className="text-xs text-mute">{i.engraving}{i.engravingFont ? ` · Font ${i.engravingFont}` : ''}</p>}
                <SetPartsText item={i} locale={locale} />
              </div>
              <button onClick={() => remove(i.key)} aria-label={d.remove} className="text-mute transition hover:text-bone"><XIcon className="size-4" /></button>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center rounded-none border border-line">
                <button onClick={() => setQty(i.key, i.qty - 1)} className="p-2 text-mute hover:text-bone" aria-label="-"><MinusIcon className="size-3.5" /></button>
                <span className="w-6 overflow-hidden text-center text-sm tabular-nums"><span key={i.qty} className="tick">{i.qty}</span></span>
                <button onClick={() => setQty(i.key, i.qty + 1)} className="p-2 text-mute hover:text-bone" aria-label="+"><PlusIcon className="size-3.5" /></button>
              </div>
              <p className="text-sm tabular-nums">{money(i.priceCents * i.qty, locale)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
