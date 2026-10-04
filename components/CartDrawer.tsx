'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useCart } from './CartProvider'
import { CartLines, FreeShippingBar } from './CartLines'
import { XIcon } from './icons'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function CartDrawer({ locale }: { locale: Locale }) {
  const { open, setOpen, items, subtotal } = useCart()
  const d = t(locale)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={() => setOpen(false)} className={`fade absolute inset-0 bg-black/60 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside role="dialog" aria-label={d.cart} className={`drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-ink ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <p className="h-display text-sm uppercase tracking-[0.2em]">{d.cart}</p>
          <button onClick={() => setOpen(false)} aria-label={d.close} className="text-mute hover:text-bone"><XIcon /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
            <p className="text-mute">{d.emptyCart}</p>
            <Link href={href(locale, 'shop')} onClick={() => setOpen(false)} className="btn">{d.continueShopping}</Link>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5"><FreeShippingBar locale={locale} /></div>
            <div className="flex-1 overflow-y-auto px-6"><CartLines locale={locale} compact /></div>
            <div className="space-y-3 border-t border-line p-6">
              <div className="flex justify-between text-sm"><span className="text-mute">{d.subtotal}</span><span className="tabular-nums">{money(subtotal, locale)}</span></div>
              <Link href={href(locale, 'checkout')} onClick={() => setOpen(false)} className="btn w-full">{d.goToCheckout}</Link>
              <Link href={href(locale, 'cart')} onClick={() => setOpen(false)} className="btn-ghost w-full">{d.viewCart}</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
