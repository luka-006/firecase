'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useCart } from './CartProvider'
import { useSetDraft } from './SetDraft'
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from './icons'
import { BUILD_SET_MAX, BUILD_SET_MIN, BUILD_SET_TIERS, nextBuiltSetTier, priceBuiltSet } from '@/lib/set-builder'
import { isOptionSoldOut, isSoldOut, optionStock } from '@/lib/stock'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import type { Variant } from '@/lib/types'

/** A case as the builder sees it. Public fields only, no supplier data. */
export type BuilderCase = {
  id: number
  slug: string
  nameHr: string
  nameEn: string
  image: string
  priceCents: number
  variants: Variant[]
  stock: number | null
  models: string[]
}

const tiersAsc = [...BUILD_SET_TIERS].sort((a, b) => a.min - b.min)

export function SetBuilder({ locale, cases }: { locale: Locale; cases: BuilderCase[] }) {
  const d = t(locale)
  const { parts, add, removeAt, removeOne, clear } = useSetDraft()
  const cart = useCart()
  const [model, setModel] = useState('')
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [sheet, setSheet] = useState(false)
  const [flash, setFlash] = useState<number | null>(null)

  const models = useMemo(() => {
    const all: string[] = []
    for (const c of cases) for (const m of c.models) if (!all.includes(m)) all.push(m)
    return all
  }, [cases])
  const shown = model ? cases.filter((c) => c.models.includes(model)) : cases
  const name = (c: { nameHr: string; nameEn: string }) => (locale === 'en' && c.nameEn ? c.nameEn : c.nameHr)
  const vname = (v?: { hr: string; en: string }) => (v ? (locale === 'en' && v.en ? v.en : v.hr) : '')

  const quote = priceBuiltSet(parts.map((p) => p.priceCents))
  const next = nextBuiltSetTier(quote.count)
  const full = quote.count >= BUILD_SET_MAX
  const ready = quote.count >= BUILD_SET_MIN

  const chosenVi = (c: BuilderCase) => {
    if (picked[c.id] != null) return picked[c.id]
    if (!c.variants.length) return -1
    const open = c.variants.findIndex((_, i) => !isOptionSoldOut(c, i))
    return open >= 0 ? open : 0
  }
  const inSet = (id: number, vi?: number) => parts.filter((p) => p.id === id && (vi == null || p.vi === vi)).length

  const addCase = (c: BuilderCase) => {
    const vi = chosenVi(c)
    const v = vi >= 0 ? c.variants[vi] : undefined
    const left = optionStock(c, vi)
    if (full || (left !== null && inSet(c.id, vi) >= left)) return
    const ok = add({ id: c.id, vi, slug: c.slug, nameHr: c.nameHr, nameEn: c.nameEn, image: c.image, priceCents: c.priceCents, variantHr: v?.hr ?? '', variantEn: v?.en ?? '' })
    if (ok) {
      setFlash(c.id)
      setTimeout(() => setFlash((f) => (f === c.id ? null : f)), 900)
    }
  }

  const toCart = () => {
    if (!ready) return
    cart.add({
      id: 0, slug: '', nameHr: t('hr').buildName, nameEn: t('en').buildName, image: parts[0]?.image ?? '',
      priceCents: quote.totalCents, vi: -1, variantHr: t('hr').buildCount(quote.count), variantEn: t('en').buildCount(quote.count),
      parts: parts.map((p) => ({ ...p })), setPercent: quote.percent,
    }, 1)
    clear()
    setSheet(false)
  }

  const status = !quote.count
    ? d.buildEmpty
    : !ready
      ? d.buildNeed(BUILD_SET_MIN - quote.count)
      : next
        ? d.buildNext(next.need, next.percent)
        : d.buildTop(quote.percent)

  const steps = (
    <div className="flex gap-1.5" aria-hidden>
      {[{ min: BUILD_SET_MIN, percent: 0 }, ...tiersAsc].map((step) => {
        const on = quote.count >= step.min
        return (
          <div key={step.min} className={`flex-1 border px-2 py-1 text-center font-mono text-[10px] uppercase tracking-[0.12em] transition ${on ? 'border-flame bg-flame text-ink' : 'border-line text-mute'}`}>
            {step.min}{step.percent ? ` · -${step.percent}%` : ' · set'}
          </div>
        )
      })}
    </div>
  )

  const totals = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-bone/80">{quote.count ? d.buildCount(quote.count) : d.buildYourSet}</span>
      <span className="flex items-baseline gap-2 font-mono tabular-nums">
        {quote.percent > 0 && <span className="text-xs text-mute line-through">{money(quote.fullCents, locale)}</span>}
        <span className={quote.percent > 0 ? 'text-flame-2' : ''}>{money(quote.totalCents, locale)}</span>
      </span>
    </div>
  )

  const list = (
    <ul className="divide-y divide-line">
      {parts.map((p, i) => (
        <li key={`${p.id}-${p.vi}-${i}`} className="flex items-center gap-3 py-2.5">
          <div className="relative size-12 shrink-0 overflow-hidden bg-ink-3">
            {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{name(p)}</p>
            {(p.variantHr || p.variantEn) && <p className="truncate text-xs text-mute">{locale === 'en' && p.variantEn ? p.variantEn : p.variantHr}</p>}
          </div>
          <span className="font-mono text-xs tabular-nums text-bone/70">{money(p.priceCents, locale)}</span>
          <button onClick={() => removeAt(i)} aria-label={d.remove} className="p-1 text-mute transition hover:text-bone"><XIcon className="size-4" /></button>
        </li>
      ))}
    </ul>
  )

  const button = (
    <button onClick={toCart} disabled={!ready} className="btn w-full py-3.5 lg:py-4">
      {ready ? d.buildToCart : d.buildNeed(BUILD_SET_MIN - quote.count)}
    </button>
  )

  return (
    <div className="mt-10 grid gap-10 pb-48 lg:grid-cols-[1fr_340px] lg:pb-0">
      <div>
        {models.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['', ...models].map((m) => (
              <button key={m || 'all'} onClick={() => setModel(m)}
                className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition ${model === m ? 'border-bone text-bone' : 'border-line text-mute hover:text-bone'}`}>
                {m || d.buildFilterAll}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 xl:grid-cols-3">
          {shown.map((c, idx) => {
            const vi = chosenVi(c)
            const gone = isSoldOut(c)
            const left = optionStock(c, vi)
            const capped = left !== null && inSet(c.id, vi) >= left
            const count = inSet(c.id)
            return (
              <div key={c.id} className="min-w-0">
                <div className="frame relative aspect-[4/5]">
                  <div className="frame-in">
                    {c.image && <Image src={c.image} alt={name(c)} fill priority={idx < 4} sizes="(min-width:1280px) 22vw, (min-width:1024px) 30vw, 50vw" className="object-cover" />}
                    {count > 0 && (
                      <span className="absolute right-2 top-2 grid min-w-7 place-items-center bg-flame px-1.5 py-1 font-mono text-[11px] tabular-nums text-ink">×{count}</span>
                    )}
                    {gone && <span className="absolute left-2 top-2 bg-black/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mute">{d.outOfStock}</span>}
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 items-baseline justify-between gap-2">
                  <Link href={href(locale, 'product', c.slug)} className="h-display min-w-0 text-sm leading-tight [overflow-wrap:anywhere] hover:text-flame sm:text-base">{name(c)}</Link>
                  <span className="shrink-0 font-mono text-sm tabular-nums">{money(c.priceCents, locale)}</span>
                </div>
                {c.models.length > 0 && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{c.models.join(' · ')}</p>}
                {c.variants.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.variants.map((v, i) => {
                      const off = isOptionSoldOut(c, i)
                      return (
                        <button key={i} disabled={off} onClick={() => setPicked((s) => ({ ...s, [c.id]: i }))}
                          className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition ${i === vi ? 'border-flame text-flame' : off ? 'border-line text-mute line-through' : 'border-line text-bone/70 hover:border-bone/50'}`}>
                          {vname(v)}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  {count > 0 && (
                    <button onClick={() => removeOne(c.id, vi)} disabled={!inSet(c.id, vi)} aria-label={d.remove}
                      className="grid w-11 shrink-0 place-items-center border border-line text-mute transition hover:text-bone disabled:opacity-40">
                      <MinusIcon className="size-4" />
                    </button>
                  )}
                  <button onClick={() => addCase(c)} disabled={gone || full || capped}
                    className="flex flex-1 items-center justify-center gap-2 border border-bone/30 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition hover:border-flame hover:text-flame disabled:opacity-40">
                    {flash === c.id ? <><CheckIcon className="size-4" /> {d.added}</> : <><PlusIcon className="size-3.5" /> {d.buildAdd}</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop: the set stays beside the grid. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5 border border-line p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-flame">{d.buildYourSet}</p>
          {steps}
          <p className="text-sm text-bone/80">{status}</p>
          {parts.length > 0 && list}
          {full && <p className="text-xs text-mute">{d.buildMax(BUILD_SET_MAX)}</p>}
          <div className="space-y-4 border-t border-line pt-4">
            {totals}
            {quote.percent > 0 && <p className="text-xs text-flame">{d.buildDiscount(quote.percent)} · -{money(quote.savedCents, locale)}</p>}
            {button}
            {parts.length > 0 && <button onClick={clear} className="w-full text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mute hover:text-bone">{d.buildClear}</button>}
          </div>
        </div>
      </aside>

      {/* Phones: a bar at the bottom, the full list opens above it. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur lg:hidden">
        {sheet && parts.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto border-b border-line px-4 pt-2">
            {list}
            <button onClick={clear} className="mb-3 mt-1 w-full text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{d.buildClear}</button>
          </div>
        )}
        <div className="space-y-2.5 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          {steps}
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs text-bone/80">{status}</p>
            {parts.length > 0 && (
              <button onClick={() => setSheet((s) => !s)} className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-flame">
                {sheet ? d.buildHide : d.buildShow}
              </button>
            )}
          </div>
          {totals}
          {button}
        </div>
      </div>
    </div>
  )
}
