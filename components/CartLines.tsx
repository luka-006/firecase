'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { MinusIcon, PlusIcon, XIcon } from './icons'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function FreeShippingBar({ locale }: { locale: Locale }) {
  const { subtotal, shipping } = useCart()
  const d = t(locale)
  const left = shipping.freeThresholdCents - subtotal
  const pct = Math.min(100, (subtotal / shipping.freeThresholdCents) * 100)
  return (
    <div>
      <p className="mb-2 text-xs text-mute">{left > 0 ? d.freeLeft(money(left, locale)) : d.freeReached}</p>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-flame to-flame-2 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CartLines({ locale, compact }: { locale: Locale; compact?: boolean }) {
  const { items, setQty, remove, setOpen } = useCart()
  const d = t(locale)
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => (
        <li key={i.key} className="flex gap-4 py-4">
          <Link href={href(locale, 'product', i.slug)} onClick={() => setOpen(false)} className={`relative shrink-0 overflow-hidden rounded-xl bg-ink-3 ${compact ? 'size-20' : 'size-24'}`}>
            {i.image && <Image src={i.image} alt="" fill sizes="96px" className="object-cover" />}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{locale === 'en' && i.nameEn ? i.nameEn : i.nameHr}</p>
                {i.vi >= 0 && <p className="text-xs text-mute">{locale === 'en' && i.variantEn ? i.variantEn : i.variantHr}</p>}
              </div>
              <button onClick={() => remove(i.key)} aria-label={d.remove} className="text-mute transition hover:text-bone"><XIcon className="size-4" /></button>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center rounded-full border border-line">
                <button onClick={() => setQty(i.key, i.qty - 1)} className="p-2 text-mute hover:text-bone" aria-label="-"><MinusIcon className="size-3.5" /></button>
                <span className="w-6 text-center text-sm tabular-nums">{i.qty}</span>
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
