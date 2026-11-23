'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { EngravingPreview } from './EngravingStudio'
import { BuyBox, type EngravingState } from './ProductClient'
import { ArrowIcon, CheckIcon } from './icons'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'

export type EngraverCase = {
  slug: string
  name: string
  price: string
  thumb: string
  href: string
  buy: React.ComponentProps<typeof BuyBox>['product']
}

/** Engraver tab: pick a case, then the engraving menu opens with a live preview. */
export function EngraverShop({ locale, cases, banner }: { locale: Locale; cases: EngraverCase[]; banner: string }) {
  const d = t(locale)
  const [slug, setSlug] = useState<string | null>(null)
  const panel = useRef<HTMLElement>(null)
  const sel = cases.find((c) => c.slug === slug) ?? null
  const [eng, setEng] = useState<EngravingState>({ text: '', font: 1, metal: 'gold' })

  useEffect(() => {
    if (sel) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [sel])

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        {/* Once a case is picked, desktop swaps the banner for the case lying flat with the engraving drawn live. */}
        <div className={sel ? 'lg:hidden' : ''}>
        <div className="frame aspect-square w-full">
          <div className="frame-in">
            <Image src={banner} alt={`${d.engraver}: ${d.engraverIntro}`} fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
        </div>
        {sel && (
          <div className="engrave-stage pop-in hidden px-6 py-10 lg:block">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">{d.engravingYours}</p>
            <EngravingPreview locale={locale} metal={eng.metal} text={eng.text} font={eng.font} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="eyebrow">{d.engravingStep(1)}</p>
        <h2 className="h-display mt-3 text-2xl leading-none sm:text-3xl">{d.engravingPick}</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {cases.map((c) => {
            const on = c.slug === slug
            return (
              <li key={c.slug}>
                <button type="button" onClick={() => setSlug(c.slug)} aria-pressed={on}
                  className={`flex w-full items-center gap-4 py-4 text-left transition ${on ? 'text-bone' : 'text-bone/85 hover:text-bone'}`}>
                  <span className={`relative size-20 shrink-0 overflow-hidden border bg-ink-3 transition ${on ? 'border-flame' : 'border-line'}`}>
                    {c.thumb && <Image src={c.thumb} alt="" fill sizes="80px" className="object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{c.name}</span>
                    <span className="mt-1 block font-mono text-sm tabular-nums text-mute">{c.price}</span>
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-2 border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition ${on ? 'border-flame bg-flame text-ink' : 'border-line hover:border-bone/50'}`}>
                    {on ? <><CheckIcon className="size-3.5" /> {d.engravingPicked}</> : d.engravingChoose}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {sel && (
          <section ref={panel} key={sel.slug} className="pop-in mt-12 scroll-mt-24">
            <p className="eyebrow">{d.engravingStep(2)}</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="h-display text-2xl leading-none sm:text-3xl">{sel.name}</h2>
              <span className="font-mono text-lg tabular-nums">{sel.price}</span>
            </div>
            <div className="mt-6">
              <BuyBox locale={locale} product={sel.buy} previewAside onEngraving={setEng} />
            </div>
            <Link href={sel.href} className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition hover:text-bone">
              {d.engravingDetails} <ArrowIcon className="size-3.5" />
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
