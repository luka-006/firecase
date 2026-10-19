'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
import { useCart } from './CartProvider'
import { FreeShippingBar } from './CartLines'
import { UpsellPopup, type UpsellProduct } from './UpsellPopup'
import { Field } from './Ui'
import { lookupPromo, startCheckout } from '@/app/actions'
import { priceOrder, UPSELL_SEEN_KEY, UPSELL_SUBTOTAL_LIMIT_CENTS } from '@/lib/commerce'
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
  upsellProducts: UpsellProduct[]
}

export function CheckoutForm({ locale, defaults, loggedIn, countries, ship, delivery, upsellProducts }: Props) {
  const d = t(locale)
  const { items, subtotal, count, discount, add, upsell } = useCart()
  const [country, setCountry] = useState(defaults.country || 'HR')
  const [state, action, pending] = useActionState(startCheckout, null)
  const [popup, setPopup] = useState(false)
  const [offerDiscount, setOfferDiscount] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null)
  const [promoError, setPromoError] = useState('')
  const [promoPending, setPromoPending] = useState(false)
  const seen = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const activePromo = promo && promo.code === promoInput.trim().toUpperCase().replace(/\s+/g, '') ? promo : null
  const priced = priceOrder(subtotal, count, upsell, country, ship, activePromo?.percent ?? 0)
  const shipping = priced.shippingCents
  const cart = JSON.stringify(items.map((i) => ({ id: i.id, vi: i.vi, qty: i.qty })))
  const offers = (() => {
    const others = upsellProducts.filter((p) => !items.some((i) => i.id === p.id))
    const same = upsellProducts.filter((p) => items.some((i) => i.id === p.id))
    return [...others, ...same].slice(0, 4)
  })()

  function onPay(e: React.FormEvent<HTMLFormElement>) {
    const single = items.length === 1 && items[0].qty === 1
    if (typeof window !== 'undefined' && sessionStorage.getItem(UPSELL_SEEN_KEY) === '1') seen.current = true
    if (single && !seen.current && offers.length) {
      e.preventDefault()
      seen.current = true
      sessionStorage.setItem(UPSELL_SEEN_KEY, '1')
      setOfferDiscount(subtotal < UPSELL_SUBTOTAL_LIMIT_CENTS)
      setPopup(true)
    }
  }

  if (!items.length) {
    return (
      <div className="mt-16 flex flex-col items-center gap-6 text-center">
        <p className="text-mute">{d.emptyCart}</p>
        <Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link>
      </div>
    )
  }

  return (
    <form ref={formRef} action={action} onSubmit={onPay} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cart" value={cart} />
      <input type="hidden" name="upsell" value={upsell ? '1' : '0'} />
      <input type="hidden" name="promo" value={activePromo?.code ?? ''} />
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
        <div>
          <label className="label" htmlFor="promo">{d.promoLabel}</label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="promo"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
              className="input min-w-0 flex-1 font-mono"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              placeholder="FC-XXXXXX"
            />
            <button
              type="button"
              className="btn-ghost btn-sm shrink-0 px-3"
              disabled={promoPending || !promoInput.trim()}
              onClick={async () => {
                setPromoPending(true)
                setPromoError('')
                try {
                  const res = await lookupPromo(promoInput, locale)
                  if (!res.ok) { setPromo(null); setPromoError(res.error); return }
                  setPromo({ code: res.code, percent: res.percent })
                  setPromoInput(res.code)
                } finally {
                  setPromoPending(false)
                }
              }}
            >{promoPending ? '…' : d.promoApply}</button>
          </div>
          {promoError && <p role="alert" className="mt-1.5 text-xs text-red-400">{promoError}</p>}
          {activePromo && !promoError && <p className="mt-1.5 text-xs text-mute">{d.promoApplied}</p>}
        </div>
        {country === 'HR' && <FreeShippingBar locale={locale} />}
        <div className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><span className="text-mute">{d.subtotal}</span><span className="tabular-nums">{money(subtotal, locale)}</span></div>
          {priced.upsellDiscountCents > 0 && <div className="flex justify-between"><span className="text-mute">{d.discount}</span><span className="tabular-nums">{money(-priced.upsellDiscountCents, locale)}</span></div>}
          {priced.promoDiscountCents > 0 && <div className="flex justify-between"><span className="text-mute">{d.promoDiscount}{activePromo ? ` ${activePromo.code}` : ''}</span><span className="tabular-nums">{money(-priced.promoDiscountCents, locale)}</span></div>}
          {priced.upsellDiscountCents === 0 && priced.promoDiscountCents === 0 && discount > 0 && <div className="flex justify-between"><span className="text-mute">{d.discount}</span><span className="tabular-nums">{money(-discount, locale)}</span></div>}
          <div className="flex justify-between"><span className="text-mute">{d.shipping}</span><span className="tabular-nums">{shipping ? money(shipping, locale) : d.free}</span></div>
          <p className="text-xs text-mute">{d.deliveryTime}: {delivery}</p>
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-base font-medium"><span>{d.total}</span><span className="tabular-nums">{money(priced.totalCents, locale)}</span></div>
        <label className="flex gap-3 text-xs leading-relaxed text-bone/75">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[#d08a2e]" />
          <span>
            {d.acceptTermsPre}<Link href={href(locale, 'terms')} target="_blank" className="link">{d.termsAccusative}</Link>{d.acceptTermsMid}
            <Link href={href(locale, 'returns')} target="_blank" className="link">{d.withdrawalInfo}</Link>{d.acceptTermsPost}
          </span>
        </label>
        {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        <button className="btn w-full py-4" disabled={pending}>{pending ? '…' : d.orderButton}</button>
      </aside>
      {popup && (
        <UpsellPopup
          locale={locale}
          products={offers}
          title={offerDiscount ? d.upsellTitle : d.upsellSuggest}
          onAdd={(p) => {
            add({
              id: p.id, slug: p.slug, nameHr: p.nameHr, nameEn: p.nameEn, image: p.image, priceCents: p.priceCents,
              vi: p.vi, variantHr: p.variantHr, variantEn: p.variantEn,
            }, 1, { silent: true, upsell: offerDiscount })
            setPopup(false)
          }}
          onSkip={() => {
            setPopup(false)
            formRef.current?.requestSubmit()
          }}
        />
      )}
    </form>
  )
}
