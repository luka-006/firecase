'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useCart } from './CartProvider'
import { useSetDraft } from './SetDraft'
import { SET_STEPS, SetLadder } from './SetLadder'
import { CheckIcon, ChevronIcon, MinusIcon, PlusIcon, TruckIcon, XIcon } from './icons'
import { BUILD_SET_MAX, BUILD_SET_MIN, nextBuiltSetTier, priceBuiltSet } from '@/lib/set-builder'
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

const pad2 = (n: number) => String(n).padStart(2, '0')
/** How long the photo flies from the card into the set; the new thumbnail shows as it lands. */
const FLIGHT_MS = 420
const LAND_DELAY = '340ms'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A copy of the case photo flies from the card into the set: the next slot on desktop, the stack on phones. */
function flyToSet(from: HTMLImageElement | null, slot: number) {
  if (!from || typeof from.animate !== 'function') return false
  const target = [...document.querySelectorAll<HTMLElement>(`[data-set-slot="${slot}"], [data-set-stack]`)].find((el) => el.getClientRects().length > 0)
  if (!target) return false
  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  if (!a.width || !b.width) return false
  const img = document.createElement('img')
  img.src = from.currentSrc || from.src
  img.alt = ''
  img.setAttribute('aria-hidden', 'true')
  img.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;object-fit:contain;z-index:70;pointer-events:none;`
  document.body.appendChild(img)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const s = Math.max(0.08, Math.min(b.width / a.width, b.height / a.height))
  // A straight, short move into the set: no lift, no turn, no bounce.
  const flight = img.animate([
    { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
    { transform: `translate3d(${dx}px,${dy}px,0) scale(${s})`, opacity: 0.7 },
  ], { duration: FLIGHT_MS, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' })
  const done = () => img.remove()
  flight.onfinish = done
  flight.oncancel = done
  return true
}

export function SetBuilder({ locale, cases }: { locale: Locale; cases: BuilderCase[] }) {
  const d = t(locale)
  const { parts, add, removeAt, removeOne, clear } = useSetDraft()
  const cart = useCart()
  const [model, setModel] = useState('')
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [sheet, setSheet] = useState(false)
  const [flash, setFlash] = useState<number | null>(null)
  // The slot that just got a case (its thumbnail waits for the flying photo), and the text for a step just reached.
  const [landing, setLanding] = useState<{ at: number; key: number; flown: boolean } | null>(null)
  const [unlocked, setUnlocked] = useState<{ key: number; text: string } | null>(null)
  const seq = useRef(0)

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

  const addCase = (c: BuilderCase, photo: HTMLImageElement | null) => {
    const vi = chosenVi(c)
    const v = vi >= 0 ? c.variants[vi] : undefined
    const left = optionStock(c, vi)
    if (full || (left !== null && inSet(c.id, vi) >= left)) return
    const at = parts.length
    const ok = add({ id: c.id, vi, slug: c.slug, nameHr: c.nameHr, nameEn: c.nameEn, image: c.image, priceCents: c.priceCents, variantHr: v?.hr ?? '', variantEn: v?.en ?? '' })
    if (ok) {
      setFlash(c.id)
      setTimeout(() => setFlash((f) => (f === c.id ? null : f)), 900)
      const key = ++seq.current
      const flown = !reducedMotion() && flyToSet(photo, at)
      setLanding({ at, key, flown })
      // A step reached by this case: the set is ready, a bigger discount, free delivery.
      const after = priceBuiltSet([...parts.map((p) => p.priceCents), c.priceCents])
      const step = SET_STEPS.find((s) => s.min === after.count)
      if (step) {
        setUnlocked({ key, text: d.buildUnlocked(after.percent, after.freeShipping) })
        setTimeout(() => setUnlocked((b) => (b?.key === key ? null : b)), 2800)
      }
    }
  }
  const dropAt = (i: number) => {
    setUnlocked(null)
    setLanding(null)
    removeAt(i)
  }

  const toCart = () => {
    if (!ready) return
    cart.add({
      id: 0, slug: '', nameHr: t('hr').buildName, nameEn: t('en').buildName, image: parts[0]?.image ?? '',
      priceCents: quote.totalCents, vi: -1, variantHr: t('hr').buildCount(quote.count), variantEn: t('en').buildCount(quote.count),
      parts: parts.map((p) => ({ ...p })), setPercent: quote.percent, freeShipping: quote.freeShipping,
    }, 1)
    clear()
    setSheet(false)
    setUnlocked(null)
    setLanding(null)
  }

  const status = !quote.count
    ? d.buildEmpty
    : !ready
      ? d.buildNeed(BUILD_SET_MIN - quote.count)
      : next
        ? d.buildNext(next.need, next.percent, next.freeShipping)
        : d.buildTop(quote.percent, quote.freeShipping)
  const statusLine = unlocked
    ? <span className="block truncate text-flame-2">{unlocked.text}</span>
    : <span className="block truncate text-bone/80">{status}</span>

  const totals = (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-bone/80">{quote.count ? d.buildCount(quote.count) : d.buildYourSet}</span>
      <span className="flex items-baseline gap-2 font-mono tabular-nums">
        {quote.percent > 0 && <span className="text-xs text-mute line-through">{money(quote.fullCents, locale)}</span>}
        <span className={`text-lg ${quote.percent > 0 ? 'text-flame-2' : ''}`}>{money(quote.totalCents, locale)}</span>
      </span>
    </div>
  )

  const list = (
    <ul className="divide-y divide-line">
      {parts.map((p, i) => (
        <li key={`${p.id}-${p.vi}-${i}`} className="flex items-center gap-3 py-2">
          <div className="relative size-10 shrink-0 overflow-hidden bg-ink-3">
            {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-contain" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{name(p)}</p>
            {(p.variantHr || p.variantEn) && <p className="truncate text-xs text-mute">{locale === 'en' && p.variantEn ? p.variantEn : p.variantHr}</p>}
          </div>
          <span className="font-mono text-xs tabular-nums text-bone/70">{money(p.priceCents, locale)}</span>
          <button onClick={() => dropAt(i)} aria-label={`${d.remove}: ${name(p)}`} className="p-1 text-mute transition hover:text-bone"><XIcon className="size-4" /></button>
        </li>
      ))}
    </ul>
  )

  // Desktop: one slot per case, up to the set maximum. The steps (2, 3, 5, 8) are marked in flame.
  const tray = (
    <ul className="grid grid-cols-5 gap-2" aria-label={d.buildTray}>
      {Array.from({ length: BUILD_SET_MAX }, (_, i) => {
        const p = parts[i]
        const fresh = !!p && landing?.at === i
        const delay = fresh && landing.flown ? LAND_DELAY : '0ms'
        const step = SET_STEPS.some((s) => s.min === i + 1)
        return (
          <li key={i} data-set-slot={i} className="relative aspect-square">
            {p ? (
              <div className={`frame group/slot absolute inset-0 ${fresh && landing.flown ? 'slot-land' : ''}`} style={{ ['--c' as string]: '8px', ['--d' as string]: delay }}>
                <div className="frame-in bg-ink-3">
                  {p.image && <Image src={p.image} alt="" fill sizes="64px" className="object-contain p-0.5" />}
                  <button onClick={() => dropAt(i)} aria-label={`${d.remove}: ${name(p)}`}
                    className="absolute inset-0 grid place-items-center bg-ink/75 text-bone opacity-0 transition focus-visible:opacity-100 group-hover/slot:opacity-100">
                    <XIcon className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className={`absolute inset-0 grid place-items-center border border-dashed font-mono text-[10px] tabular-nums ${step ? 'border-flame/40 text-flame/70' : 'border-line text-mute/40'}`}>{i + 1}</div>
            )}
          </li>
        )
      })}
    </ul>
  )

  // Phones: the last few cases as a small stack. It opens the full list.
  const stack = (
    <button type="button" data-set-stack onClick={() => parts.length && setSheet((s) => !s)} aria-expanded={sheet} aria-label={sheet ? d.buildHide : d.buildShow}
      className="relative flex h-11 shrink-0 items-center gap-1.5 pr-1">
      <span className="relative flex items-center">
        {parts.length ? parts.slice(-3).map((p, i, arr) => (
          <span key={`${p.id}-${p.vi}-${parts.length - arr.length + i}`}
            className={`frame relative block size-10 ${i ? '-ml-5' : ''} ${i === arr.length - 1 && landing?.flown ? 'slot-land' : ''}`}
            style={{ ['--c' as string]: '6px', ['--d' as string]: i === arr.length - 1 && landing?.flown ? LAND_DELAY : '0ms', zIndex: i }}>
            <span className="frame-in bg-ink-3">{p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-contain" />}</span>
          </span>
        )) : (
          <span className="grid size-10 place-items-center border border-dashed border-line text-mute"><PlusIcon className="size-4" /></span>
        )}
        <span className="absolute -right-2 -top-1.5 z-10 grid min-w-[18px] place-items-center bg-flame px-1 font-mono text-[10px] font-medium leading-[18px] tabular-nums text-ink">
          {parts.length}
        </span>
      </span>
      {parts.length > 0 && <ChevronIcon className={`size-4 text-mute transition duration-300 ${sheet ? '' : 'rotate-180'}`} />}
    </button>
  )

  return (
    <div className="mt-10 grid gap-10 pb-40 lg:grid-cols-[1fr_360px] lg:pb-0">
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
              <div key={c.id} data-case className="min-w-0">
                {/* Case photos are square, so a square frame shows the whole case without cropping. */}
                <div className="frame relative aspect-square">
                  <div className="frame-in bg-[radial-gradient(75%_65%_at_50%_45%,#1d1d1d_0%,#111_72%)]">
                    {c.image && <Image src={c.image} alt={name(c)} fill loading={idx < 4 ? 'eager' : 'lazy'} sizes="(min-width:1280px) 22vw, (min-width:1024px) 30vw, 50vw" className="object-contain" />}
                    {count > 0 && (
                      <span className="absolute right-2 top-2 grid min-w-7 place-items-center bg-flame px-1.5 py-1 font-mono text-[11px] tabular-nums text-ink">×{count}</span>
                    )}
                    {gone && <span className="absolute left-2 top-2 bg-black/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mute">{d.outOfStock}</span>}
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
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
                    <button onClick={() => { setUnlocked(null); setLanding(null); removeOne(c.id, vi) }} disabled={!inSet(c.id, vi)} aria-label={d.remove}
                      className="grid w-11 shrink-0 place-items-center border border-line text-mute transition hover:text-bone disabled:opacity-40">
                      <MinusIcon className="size-4" />
                    </button>
                  )}
                  <button data-build-add onClick={(e) => addCase(c, e.currentTarget.closest('[data-case]')?.querySelector('img') ?? null)} disabled={gone || full || capped}
                    className={`flex flex-1 items-center justify-center gap-2 border py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition hover:border-flame hover:text-flame disabled:opacity-40 ${flash === c.id ? 'border-flame text-flame' : 'border-bone/30'}`}>
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
        <div className="sticky top-24">
          <div className="frame" style={{ ['--c' as string]: '18px' }}>
            <div className="frame-in relative inset-auto m-px space-y-6 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">{d.buildYourSet}</p>
                <p className="font-mono text-xs tabular-nums text-mute"><span className="text-bone">{pad2(quote.count)}</span> / {pad2(BUILD_SET_MAX)}</p>
              </div>
              {tray}
              <SetLadder locale={locale} count={quote.count} />
              <p className="text-sm" aria-live="polite">{statusLine}</p>
              {parts.length > 0 && <div className={`-mt-2 max-h-48 overflow-y-auto pr-1 ${parts.length > 4 ? '[mask-image:linear-gradient(to_bottom,#000_78%,transparent)]' : ''}`}>{list}</div>}
              {full && <p className="text-xs text-mute">{d.buildMax(BUILD_SET_MAX)}</p>}
              <div className="space-y-4 border-t border-line pt-4">
                {totals}
                {(quote.percent > 0 || quote.freeShipping) && (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-flame">
                    {quote.percent > 0 && <span>{d.buildDiscount(quote.percent)} · −{money(quote.savedCents, locale)}</span>}
                    {quote.freeShipping && <span className="inline-flex items-center gap-1.5"><TruckIcon className="size-4" />{d.buildFreeShip}</span>}
                  </p>
                )}
                <button data-build-tocart onClick={toCart} disabled={!ready} className="btn w-full py-4">
                  {ready ? d.buildToCart : d.buildNeed(BUILD_SET_MIN - quote.count)}
                </button>
                {parts.length > 0 && <button onClick={() => { clear(); setUnlocked(null); setLanding(null) }} className="w-full text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mute hover:text-bone">{d.buildClear}</button>}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Phones: a compact bar at the bottom, the full list opens above it. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur lg:hidden">
        {sheet && parts.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto border-b border-line px-4 pt-2">
            {list}
            <button onClick={() => { clear(); setSheet(false); setUnlocked(null); setLanding(null) }} className="mb-3 mt-1 w-full py-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{d.buildClear}</button>
          </div>
        )}
        <div className="space-y-2 px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5">
          <SetLadder locale={locale} count={quote.count} compact />
          <p className="text-xs leading-tight" aria-live="polite">{statusLine}</p>
          <div className="flex items-center gap-3">
            {stack}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-mono text-[15px] tabular-nums"><span className={quote.percent > 0 ? 'text-flame-2' : ''}>{money(quote.totalCents, locale)}</span></p>
              <p className="truncate font-mono text-[10px] tabular-nums text-mute">
                {quote.percent > 0
                  ? <><span className="line-through">{money(quote.fullCents, locale)}</span> <span className="text-flame">−{quote.percent}%</span></>
                  : quote.count ? d.buildCount(quote.count) : d.buildYourSet}
              </p>
            </div>
            <button data-build-tocart onClick={toCart} disabled={!ready} className="btn shrink-0 px-5 py-3.5">{d.buildToCartShort}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
