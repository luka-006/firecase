'use client'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { CartLines, FreeShippingBar } from './CartLines'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import { PageHead } from './PageHead'

export function CartView({ locale }: { locale: Locale }) {
  const { items, subtotal, shipping } = useCart()
  const d = t(locale)
  const ship = subtotal >= shipping.freeThresholdCents ? 0 : shipping.shippingCents
  return (
    <>
    <PageHead eyebrow={d.footerShop} title={d.cart} />
    <div className="container-x">
      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-start gap-6">
          <p className="text-mute">{d.emptyCart}</p>
          <Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="border-t border-line"><CartLines locale={locale} /></div>
          <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
            <FreeShippingBar locale={locale} />
            <div className="flex justify-between text-sm"><span className="text-mute">{d.subtotal}</span><span className="tabular-nums">{money(subtotal, locale)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-mute">{d.shipping} (HR)</span><span className="tabular-nums">{ship ? money(ship, locale) : d.free}</span></div>
            <div className="flex justify-between border-t border-line pt-4 font-medium"><span>{d.total}</span><span className="tabular-nums">{money(subtotal + ship, locale)}</span></div>
            <Link href={href(locale, 'checkout')} className="btn w-full">{d.goToCheckout}</Link>
          </aside>
        </div>
      )}
    </div>
    </>
  )
}
