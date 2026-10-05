'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useCart } from './CartProvider'
import { CheckIcon, HeartIcon, MinusIcon, PlusIcon } from './icons'
import { favoriteState, toggleFavorite } from '@/app/actions'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import type { Variant } from '@/lib/types'

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0)
  if (!images.length) return <div className="frame aspect-square"><div className="frame-in" /></div>
  return (
    <div className="space-y-3">
      <div className="frame aspect-square">
        <div className="frame-in">
          {images.map((src, idx) => (
            <Image key={src} src={src} alt={idx === 0 ? alt : ''} fill priority={idx === 0} sizes="(min-width:1024px) 50vw, 100vw"
              className={`object-cover transition-opacity duration-500 ${idx === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button key={src} onClick={() => setI(idx)} aria-label={`${idx + 1}`}
              className={`relative size-20 shrink-0 overflow-hidden border transition ${idx === i ? 'border-flame' : 'border-line opacity-60 hover:opacity-100'}`}>
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type BuyProps = {
  locale: Locale
  product: { id: number; slug: string; nameHr: string; nameEn: string; image: string; priceCents: number; variants: Variant[]; soldOut: boolean }
}

export function BuyBox({ locale, product }: BuyProps) {
  const { add } = useCart()
  const d = t(locale)
  const [vi, setVi] = useState(product.variants.length ? 0 : -1)
  const [qty, setQty] = useState(1)
  const [done, setDone] = useState(false)
  const onAdd = () => {
    const v = product.variants[vi]
    add({ id: product.id, slug: product.slug, nameHr: product.nameHr, nameEn: product.nameEn, image: product.image, priceCents: product.priceCents, vi, variantHr: v?.hr ?? '', variantEn: v?.en ?? '' }, qty)
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }
  return (
    <div className="space-y-6">
      {product.variants.length > 0 && (
        <div>
          <p className="label">{d.variant}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v, idx) => (
              <button key={idx} onClick={() => setVi(idx)}
                className={`border px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] transition ${idx === vi ? 'border-flame bg-flame text-ink' : 'border-line text-bone/80 hover:border-bone/50'}`}>
                {locale === 'en' && v.en ? v.en : v.hr}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex items-center rounded-none border border-line">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3.5 text-mute hover:text-bone" aria-label="-"><MinusIcon className="size-4" /></button>
          <span className="w-7 text-center tabular-nums" aria-label={d.qty}>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="p-3.5 text-mute hover:text-bone" aria-label="+"><PlusIcon className="size-4" /></button>
        </div>
        <button onClick={onAdd} disabled={product.soldOut} className="btn flex-1">
          {product.soldOut ? d.outOfStock : done ? (<><CheckIcon className="size-4" /> {d.added}</>) : d.addToCart}
        </button>
        <FavoriteButton locale={locale} productId={product.id} />
      </div>
    </div>
  )
}

export function FavoriteButton({ locale, productId }: { locale: Locale; productId: number }) {
  const [state, setState] = useState<{ loggedIn: boolean; fav: boolean } | null>(null)
  const [pending, start] = useTransition()
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
      disabled={!state || pending}
      onClick={() => start(async () => setState(await toggleFavorite(productId)))}
      aria-label={state?.fav ? d.removeFav : d.addFav}
      aria-pressed={!!state?.fav}
      className={`grid size-[50px] shrink-0 place-items-center rounded-none border transition ${state?.fav ? 'border-flame text-flame' : 'border-line text-bone/70 hover:border-bone/50 hover:text-bone'}`}>
      <HeartIcon filled={state?.fav} />
    </button>
  )
}
