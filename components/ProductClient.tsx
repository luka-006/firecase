'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useCart } from './CartProvider'
import { addToSetDraft, useSetDraft } from './SetDraft'
import { SetLadder } from './SetLadder'
import { BUILD_SET_MIN, BUILD_SET_TIERS } from '@/lib/set-builder'
import { ArrowIcon, CheckIcon, HeartIcon, MinusIcon, PlusIcon, XIcon } from './icons'
import { favoriteState, toggleFavorite } from '@/app/actions'
import { ENGRAVING_MAX, engravingText } from '@/lib/engrave'
import { DEFAULT_ENGRAVE_FONT, engraveMetal } from '@/lib/engrave-fonts'
import { EngravingFontPicker, EngravingPreview } from './EngravingStudio'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import { isOptionSoldOut, optionStock } from '@/lib/stock'
import { photoForVariant } from '@/lib/variants'
import type { Variant } from '@/lib/types'

const pad2 = (n: number) => String(n).padStart(2, '0')

// Picking a colour in the buy box shows that colour's photo in the gallery beside it.
const VARIANT_PHOTO_EVENT = 'fc:variant-photo'

// Povlačenje prstom/mišem lijevo-desno za promjenu slike
function useSwipe(go: (d: number) => void, enabled = true) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const reset = () => { start.current = null; setDragging(false); setDx(0) }
  const handlers = enabled
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          start.current = { x: e.clientX, y: e.clientY }
          moved.current = false
        },
        onPointerMove: (e: React.PointerEvent) => {
          if (!start.current) return
          const d = e.clientX - start.current.x
          if (!dragging && Math.abs(d) > 8 && Math.abs(d) > Math.abs(e.clientY - start.current.y)) {
            setDragging(true)
            ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          }
          if (dragging || Math.abs(d) > 8) {
            moved.current = true
            setDx(d)
          }
        },
        onPointerUp: () => {
          if (start.current && dragging && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          reset()
        },
        onPointerCancel: reset,
      }
    : {}
  return { dx: dragging ? dx : 0, dragging, handlers, wasDrag: () => moved.current }
}

function Track({ index, swipe, children, className = '' }: { index: number; swipe: ReturnType<typeof useSwipe>; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-full select-none transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${className}`}
      style={{ transform: `translateX(calc(${-index * 100}% + ${swipe.dx}px))`, transitionDuration: swipe.dragging ? '0ms' : undefined }}
      {...swipe.handlers}
    >
      {children}
    </div>
  )
}

/** `portrait`: set photos are made 4:5 (like their Kolekcija cards), case photos are square. */
export function Gallery({ images, alt, portrait }: { images: string[]; alt: string; portrait?: boolean }) {
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const n = images.length
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n])
  const swipe = useSwipe(go, n > 1)
  useEffect(() => {
    const onPhoto = (e: Event) => {
      const at = images.indexOf((e as CustomEvent<string>).detail)
      if (at >= 0) setI(at)
    }
    window.addEventListener(VARIANT_PHOTO_EVENT, onPhoto)
    return () => window.removeEventListener(VARIANT_PHOTO_EVENT, onPhoto)
  }, [images])
  const aspect = portrait ? 'aspect-[4/5]' : 'aspect-square'
  if (!n) return <div className={`frame ${aspect} w-full min-w-0`}><div className="frame-in" /></div>
  return (
    <div className="min-w-0 max-w-full space-y-3">
      <div className={`frame ${aspect} w-full min-w-0`} data-reveal>
        <div className="frame-in">
          <div className="curtain absolute inset-0">
            <Track index={i} swipe={swipe} className="touch-pan-y">
              {images.map((src, idx) => (
                <button key={src} type="button" onClick={() => !swipe.wasDrag() && setOpen(true)} aria-label={`${alt} ${idx + 1}`}
                  className="group/img relative h-full w-full shrink-0 cursor-zoom-in overflow-hidden">
                  {/* Whole photo: case photos are square and fill the frame, set photos (4:5) keep their title in view. */}
                  <Image src={src} alt={idx === 0 ? alt : ''} fill priority={idx === 0} sizes="(min-width:1024px) 50vw, 100vw" draggable={false}
                    className="object-contain transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover/img:scale-[1.03]" />
                </button>
              ))}
            </Track>
          </div>
          {n > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
              {images.map((src, idx) => (
                <span key={src} className={`h-[3px] transition-all duration-500 ${idx === i ? 'w-6 bg-flame' : 'w-3 bg-bone/30'}`} />
              ))}
            </div>
          )}
          <span className="pointer-events-none absolute right-4 top-4 grid size-8 place-items-center bg-black/50 text-bone/80 backdrop-blur"><PlusIcon className="size-4" /></span>
        </div>
      </div>
      {n > 1 && (
        <div className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-1">
          {images.map((src, idx) => (
            <button key={src} onClick={() => setI(idx)} aria-label={`${idx + 1}`}
              className={`relative size-20 shrink-0 overflow-hidden border transition ${idx === i ? 'border-flame' : 'border-line opacity-60 hover:opacity-100'}`}>
              <Image src={src} alt="" fill sizes="80px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox images={images} index={i} go={go} onClose={() => setOpen(false)} alt={alt} />}
    </div>
  )
}

// Slika preko cijelog ekrana: swipe, strelice, Esc; klik povećava (zoom) na mjestu klika
function Lightbox({ images, index, go, onClose, alt }: { images: string[]; index: number; go: (d: number) => void; onClose: () => void; alt: string }) {
  const [zoom, setZoom] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const n = images.length
  const step = useCallback((d: number) => { setZoom(false); go(d) }, [go])
  const swipe = useSwipe(step, n > 1 && !zoom)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [step, onClose])
  const at = (e: React.PointerEvent | React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="lb-in fixed inset-0 z-[60] flex flex-col bg-ink">
      <div className="flex items-center justify-between px-5 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
        <span>{pad2(index + 1)} / {pad2(n)}</span>
        <button onClick={onClose} aria-label="Zatvori" className="p-2 text-bone/80 transition hover:rotate-90 hover:text-bone"><XIcon /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <Track index={index} swipe={swipe} className={zoom ? 'touch-none' : 'touch-pan-y'}>
          {images.map((src, idx) => (
            <div key={src} className="relative h-full w-full shrink-0 overflow-hidden"
              onClick={(e) => { if (swipe.wasDrag() || idx !== index) return; at(e); setZoom((z) => !z) }}
              onPointerMove={(e) => zoom && idx === index && at(e)}>
              <Image src={src} alt={idx === index ? alt : ''} fill sizes="100vw" draggable={false} style={{ transformOrigin: origin }}
                className={`object-contain transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${zoom && idx === index ? 'scale-[2.2] cursor-zoom-out' : 'cursor-zoom-in'}`} />
            </div>
          ))}
        </Track>
        {n > 1 && !zoom && (
          <>
            <button onClick={() => step(-1)} aria-label="Prethodna" className="absolute left-3 top-1/2 hidden -translate-y-1/2 border border-bone/20 p-3 text-bone/80 transition hover:border-bone hover:text-bone md:block"><ArrowIcon className="size-5 rotate-180" /></button>
            <button onClick={() => step(1)} aria-label="Sljedeća" className="absolute right-3 top-1/2 hidden -translate-y-1/2 border border-bone/20 p-3 text-bone/80 transition hover:border-bone hover:text-bone md:block"><ArrowIcon className="size-5" /></button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export type EngravingState = { text: string; font: number; metal: 'gold' | 'silver' }

type BuyProps = {
  locale: Locale
  product: { id: number; slug: string; nameHr: string; nameEn: string; image: string; priceCents: number; variants: Variant[]; stock: number | null; freeShipping?: boolean; engrave?: boolean }
  /** The page shows the big engraving preview beside the buy box on desktop, so the inline one is for phones only. */
  previewAside?: boolean
  onEngraving?: (state: EngravingState) => void
  /** Plain case: the button puts it into "Napravi svoj set" instead of the cart. */
  setOnly?: boolean
}

export function BuyBox({ locale, product, previewAside, onEngraving, setOnly }: BuyProps) {
  const { add, items } = useCart()
  const draft = useSetDraft().parts
  const router = useRouter()
  const d = t(locale)
  const stocked = { stock: product.stock, variants: product.variants }
  const firstOpen = product.variants.findIndex((_, i) => !isOptionSoldOut(stocked, i))
  const [vi, setVi] = useState(product.variants.length ? (firstOpen >= 0 ? firstOpen : 0) : -1)
  const [qty, setQty] = useState(1)
  const [done, setDone] = useState(false)
  const [engraving, setEngraving] = useState('')
  const [engravingBad, setEngravingBad] = useState(false)
  const [engravingFont, setEngravingFont] = useState<number>(DEFAULT_ENGRAVE_FONT)
  const engravingLive = engravingText(engraving).ok
  const engravingMetal = engraveMetal(product.variants[vi])
  const engravingShown = engravingLive ? engraving : ''
  useEffect(() => {
    onEngraving?.({ text: engravingShown, font: engravingFont, metal: engravingMetal })
  }, [onEngraving, engravingShown, engravingFont, engravingMetal])
  const tracked = optionStock(stocked, vi)
  const inCart = items.filter((i) => i.id === product.id && i.vi === vi).reduce((sum, i) => sum + i.qty, 0)
  const room = tracked === null ? null : Math.max(0, tracked - inCart)
  const cap = room === null ? 99 : room
  const soldOut = tracked !== null && cap <= 0
  const low = tracked !== null && tracked >= 1 && tracked <= 10
  useEffect(() => {
    if (cap <= 0) return
    setQty((q) => Math.min(q, cap))
  }, [cap])
  const onAdd = () => {
    if (setOnly) {
      if (soldOut) return
      const v = product.variants[vi]
      addToSetDraft({ id: product.id, vi, slug: product.slug, nameHr: product.nameHr, nameEn: product.nameEn, image: photoForVariant(product, vi), priceCents: product.priceCents, variantHr: v?.hr ?? '', variantEn: v?.en ?? '' })
      router.push(href(locale, 'build'))
      return
    }
    if (soldOut || qty < 1 || qty > cap) return
    const parsed = product.engrave ? engravingText(engraving) : { ok: true as const, text: '' }
    if (!parsed.ok) {
      setEngravingBad(true)
      return
    }
    const v = product.variants[vi]
    add({ id: product.id, slug: product.slug, nameHr: product.nameHr, nameEn: product.nameEn, image: photoForVariant(product, vi), priceCents: product.priceCents, vi, variantHr: v?.hr ?? '', variantEn: v?.en ?? '', freeShipping: product.freeShipping, ...(parsed.text ? { engraving: parsed.text, engravingFont } : {}) }, qty)
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }
  return (
    <div className="space-y-6">
      {low && (
        <p className="inline-flex max-w-full border border-flame/70 bg-ink/85 px-2 py-1 font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-flame">{d.lastPieces}</p>
      )}
      {product.variants.length > 0 && (
        <div>
          <p className="label">{d.colour}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v, idx) => {
              const gone = isOptionSoldOut(stocked, idx)
              return (
                <button key={idx} onClick={() => {
                  setVi(idx)
                  if (v.image) window.dispatchEvent(new CustomEvent(VARIANT_PHOTO_EVENT, { detail: v.image }))
                }}
                  className={`border px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] transition ${idx === vi ? 'border-flame bg-flame text-ink' : gone ? 'border-line text-mute line-through' : 'border-line text-bone/80 hover:border-bone/50'}`}>
                  {locale === 'en' && v.en ? v.en : v.hr}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {product.engrave && (
        <div className="space-y-5 border border-line p-4 sm:p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-flame">{d.engravingYours}</p>
        {/* Stays in view on phones while the name is typed and the font picked. */}
        <div className={`engrave-stage sticky top-16 z-10 -mx-4 px-3 py-5 sm:-mx-5 sm:px-6 ${previewAside ? 'lg:hidden' : ''}`}>
          <EngravingPreview locale={locale} metal={engravingMetal} text={engravingShown} font={engravingFont} />
        </div>
        <label className="block">
          <span className="label flex items-baseline justify-between gap-3">{d.engraving}<span className="font-mono text-[10px] tabular-nums text-mute">{engraving.length}/{ENGRAVING_MAX}</span></span>
          <input
            value={engraving}
            maxLength={ENGRAVING_MAX}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            placeholder={d.engravingPlaceholder}
            aria-label={d.engraving}
            aria-invalid={engravingBad || !engravingLive}
            onChange={(e) => { setEngraving(e.target.value); setEngravingBad(false) }}
            className="input"
          />
          <span className="mt-1 block text-xs text-mute">{d.engravingHint}</span>
          {(engravingBad || !engravingLive) && <span className="mt-1 block text-sm text-red-300">{d.engravingError}</span>}
        </label>
        <EngravingFontPicker locale={locale} text={engravingShown} value={engravingFont} onChange={setEngravingFont} />
        </div>
      )}
      <div className="flex gap-3">
        {!setOnly && (
        <div className="flex items-center rounded-none border border-line">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3.5 text-mute hover:text-bone" aria-label="-"><MinusIcon className="size-4" /></button>
          <span className="w-7 overflow-hidden text-center tabular-nums" aria-label={d.qty}><span key={qty} className="tick">{qty}</span></span>
          <button onClick={() => setQty((q) => Math.min(cap > 0 ? cap : q, q + 1))} disabled={cap <= 0 || qty >= cap} className="p-3.5 text-mute hover:text-bone disabled:opacity-40" aria-label="+"><PlusIcon className="size-4" /></button>
        </div>
        )}
        <button onClick={onAdd} disabled={soldOut} className="btn flex-1">
          {soldOut ? d.outOfStock : done ? (<span className="pop-in inline-flex items-center gap-2"><CheckIcon className="size-4" /> {d.added}</span>) : setOnly ? d.addToSet : d.addToCart}
        </button>
        <FavoriteButton locale={locale} productId={product.id} />
      </div>
      {setOnly && (
        <div className="space-y-4 border border-line p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-flame">{d.buildSet}</p>
          <SetLadder locale={locale} count={draft.length} compact />
          <p className="text-xs leading-relaxed text-mute">
            {d.setOnlyNote(BUILD_SET_MIN)} <span className="text-flame">{d.buildTiers(BUILD_SET_TIERS)}</span>
          </p>
          {draft.length > 0 && (
            <Link href={href(locale, 'build')} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bone/80 transition hover:text-flame-2">
              {d.buildInYourSet(draft.length)} <ArrowIcon className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function FavoriteButton({ locale, productId }: { locale: Locale; productId: number }) {
  const [state, setState] = useState<{ loggedIn: boolean; fav: boolean } | null>(null)
  const [pending, start] = useTransition()
  const [burst, setBurst] = useState(0)
  const d = t(locale)
  useEffect(() => {
    favoriteState(productId).then(setState).catch(() => {})
  }, [productId])
  if (state && !state.loggedIn) {
    return (
      <Link href={href(locale, 'login')} title={d.loginToFav} aria-label={d.loginToFav} className="grid size-[50px] shrink-0 place-items-center rounded-none border border-line text-bone/70 transition hover:border-bone/50 hover:text-bone">
        <HeartIcon />
      </Link>
    )
  }
  return (
    <button
      disabled={!state}
      onClick={() => {
        const next = !state?.fav
        setState({ loggedIn: true, fav: next })
        if (next) setBurst((b) => b + 1)
        start(async () => setState(await toggleFavorite(productId)))
      }}
      aria-label={state?.fav ? d.removeFav : d.addFav}
      aria-pressed={!!state?.fav}
      className={`relative grid size-[50px] shrink-0 place-items-center rounded-none border transition ${state?.fav ? 'border-flame text-flame' : 'border-line text-bone/70 hover:border-bone/50 hover:text-bone'}`}>
      <span key={burst} className={burst && state?.fav ? 'heart-pop inline-flex' : 'inline-flex'}><HeartIcon filled={state?.fav} /></span>
      {burst > 0 && state?.fav && <span key={`r${burst}`} className="heart-ring" />}
    </button>
  )
}
