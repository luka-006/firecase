'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { money } from '@/lib/money'
import type { Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export type UpsellProduct = {
  id: number
  slug: string
  nameHr: string
  nameEn: string
  image: string
  priceCents: number
  vi: number
  variantHr: string
  variantEn: string
}

function lockPageScroll() {
  const html = document.documentElement
  const body = document.body
  const gap = Math.max(0, window.innerWidth - html.clientWidth)
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPadding: body.style.paddingRight,
  }
  if (gap) body.style.paddingRight = `${gap}px`
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  return () => {
    html.style.overflow = prev.htmlOverflow
    body.style.overflow = prev.bodyOverflow
    body.style.paddingRight = prev.bodyPadding
  }
}

export function UpsellPopup({
  locale,
  products,
  title,
  onAdd,
  onSkip,
}: {
  locale: Locale
  products: UpsellProduct[]
  title: string
  onAdd: (p: UpsellProduct) => void
  onSkip: () => void
}) {
  const d = t(locale)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => lockPageScroll(), [])

  if (!mounted) return null

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden overscroll-none bg-black/80"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-title"
        className="card flex max-h-[85dvh] w-full min-w-0 max-w-3xl flex-col overflow-hidden"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8">
          <h2 id="upsell-title" className="h-display text-xl leading-tight [overflow-wrap:anywhere] sm:text-3xl">{title}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-4">
            {products.map((p) => {
              const name = locale === 'en' && p.nameEn ? p.nameEn : p.nameHr
              return (
                <li key={p.id} className="min-w-0">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-ink-3">
                    {p.image && <Image src={p.image} alt="" fill sizes="180px" className="object-cover" />}
                  </span>
                  <span className="mt-2 block min-w-0 text-sm leading-tight [overflow-wrap:anywhere]">{name}</span>
                  <span className="mt-1 block whitespace-nowrap font-mono text-sm tabular-nums">{money(p.priceCents, locale)}</span>
                  <button type="button" className="btn btn-sm mt-3 w-full min-w-0 whitespace-normal px-2 text-center leading-tight" onClick={() => onAdd(p)}>
                    {d.upsellAdd}
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn-ghost mt-6 w-full" onClick={onSkip}>{d.upsellSkip}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
