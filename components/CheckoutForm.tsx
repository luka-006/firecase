'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useCart } from './CartProvider'
import { Field } from './Ui'
import { startCheckout } from '@/app/actions'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

type Props = {
  locale: Locale
  defaults: Record<string, string>
  loggedIn: boolean
  countries: { code: string; name: string }[]
  ship: { shippingCents: number; freeThresholdCents: number; euShippingCents: number }
  delivery: string
}

export function CheckoutForm({ locale, defaults, loggedIn, countries, ship, delivery }: Props) {
  const d = t(locale)
  const { items, subtotal } = useCart()
  const [country, setCountry] = useState(defaults.country || 'HR')
  const [state, action, pending] = useActionState(startCheckout, null)
  const shipping = country === 'HR' ? (subtotal >= ship.freeThresholdCents ? 0 : ship.shippingCents) : ship.euShippingCents
  const cart = JSON.stringify(items.map((i) => ({ id: i.id, vi: i.vi, qty: i.qty })))

  if (!items.length) {
    return (
      <div className="mt-16 flex flex-col items-center gap-6 text-center">
        <p className="text-mute">{d.emptyCart}</p>
        <Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link>
      </div>
    )
  }

  return (
    <form action={action} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cart" value={cart} />
      <div className="space-y-10">
        <fieldset className="space-y-4">
          <legend className="h-display mb-6 text-xl"><span className="idx mr-3 align-top">01</span>{d.contactDetails}</legend>
          <Field label={d.email} name="email" type="email" required autoComplete="email" defaultValue={defaults.email} />
          <Field label={d.phone} name="phone" type="tel" required autoComplete="tel" defaultValue={defaults.phone} />
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="h-display mb-6 text-xl"><span className="idx mr-3 align-top">02</span>{d.deliveryAddress}</legend>
          <Field label={d.name} name="name" required autoComplete="name" defaultValue={defaults.name} />
          <Field label={d.address} name="address" required autoComplete="street-address" defaultValue={defaults.address} />
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <Field label={d.postal} name="postal" required autoComplete="postal-code" defaultValue={defaults.postal} />
            <Field label={d.city} name="city" required autoComplete="address-level2" defaultValue={defaults.city} />
          </div>
          <label className="block">
            <span className="label">{d.country} *</span>
            <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="input" autoComplete="country">
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">{d.note}</span>
            <textarea name="note" rows={3} maxLength={1000} className="input resize-none" />
          </label>
          {loggedIn && (
            <label className="flex items-center gap-3 text-sm text-bone/80"><input type="checkbox" name="save" defaultChecked className="size-4 accent-[#d08a2e]" />{d.saveDetails}</label>
          )}
        </fieldset>
      </div>

      <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
        <p className="h-display text-xl"><span className="idx mr-3 align-top">03</span>{d.orderSummary}</p>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 text-sm">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-ink-3">
                {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-0 -top-0 grid size-5 place-items-center rounded-bl-lg bg-bone text-[10px] font-semibold text-ink">{i.qty}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{locale === 'en' && i.nameEn ? i.nameEn : i.nameHr}</span>
                {i.vi >= 0 && <span className="block text-xs text-mute">{locale === 'en' && i.variantEn ? i.variantEn : i.variantHr}</span>}
              </span>
              <span className="tabular-nums">{money(i.priceCents * i.qty, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><span className="text-mute">{d.subtotal}</span><span className="tabular-nums">{money(subtotal, locale)}</span></div>
          <div className="flex justify-between"><span className="text-mute">{d.shipping}</span><span className="tabular-nums">{shipping ? money(shipping, locale) : d.free}</span></div>
          <p className="text-xs text-mute">{d.deliveryTime}: {delivery}</p>
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-base font-medium"><span>{d.total}</span><span className="tabular-nums">{money(subtotal + shipping, locale)}</span></div>
        <label className="flex gap-3 text-xs leading-relaxed text-bone/75">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[#d08a2e]" />
          <span>
            {d.acceptTermsPre}<Link href={href(locale, 'terms')} target="_blank" className="link">{d.terms}</Link>{d.acceptTermsMid}
            <Link href={href(locale, 'returns')} target="_blank" className="link">{d.withdrawalInfo}</Link>{d.acceptTermsPost}
          </span>
        </label>
        {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        <button className="btn w-full py-4" disabled={pending}>{pending ? '…' : d.orderButton}</button>
        <p className="text-[11px] leading-relaxed text-mute">{d.payNote}</p>
        <p className="text-center text-[11px] text-mute">{d.payments}</p>
      </aside>
    </form>
  )
}
