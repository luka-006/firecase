'use client'
import Image from 'next/image'
import { useLayoutEffect, useRef, useState } from 'react'
import { ENGRAVE_FONT_FAMILY } from './engrave-fonts'
import { ENGRAVE_FONTS } from '@/lib/engrave-fonts'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'

// Text area on the blank case renders in public/engrave (1377 x 482, hood on the right).
const TEXT_BOX = { left: '7.5%', width: '70.5%', top: '22%', height: '56%' }

// The supplier's laser engraving comes out white on every colour.
const INK = {
  gold: { color: 'rgba(255,251,240,.96)', textShadow: '0 0 1px rgba(92,62,14,.55), 0 1px 2px rgba(92,62,14,.4)' },
  silver: { color: 'rgba(255,255,255,.97)', textShadow: '0 0 1px rgba(30,30,34,.6), 0 1px 2px rgba(30,30,34,.45)' },
}

/** Blank case with the typed name drawn on it, shrunk to fit the engraving area. */
export function EngravingPreview({ locale, metal, text, font }: { locale: Locale; metal: 'gold' | 'silver'; text: string; font: number }) {
  const d = t(locale)
  const box = useRef<HTMLDivElement>(null)
  const span = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  const family = ENGRAVE_FONT_FAMILY[font] ?? ENGRAVE_FONT_FAMILY[1]
  const shown = text.trim() || d.engravingSample

  useLayoutEffect(() => {
    let live = true
    // Font size is in container units, so the fit ratio does not depend on screen width.
    const fit = () => {
      const b = box.current
      const s = span.current
      if (!b || !s || !live) return
      const w = s.scrollWidth
      const h = s.scrollHeight
      setScale(Math.min(1, w ? b.clientWidth / w : 1, h ? b.clientHeight / h : 1))
    }
    fit()
    document.fonts?.load(`40px ${family}`).then(fit).catch(() => {})
    return () => { live = false }
  }, [shown, family])

  return (
    <figure className="relative">
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: '1377 / 482' }}>
        {(['gold', 'silver'] as const).map((m) => (
          <Image key={m} src={`/engrave/case-${m}.webp`} alt="" fill sizes="(min-width:1024px) 40vw, 92vw" priority={m === metal}
            className={`object-contain transition-opacity duration-500 ${m === metal ? 'opacity-100' : 'opacity-0'}`} />
        ))}
        <div ref={box} className="absolute flex items-center justify-center overflow-hidden" style={TEXT_BOX}>
          <span ref={span} aria-live="polite"
            className={`whitespace-nowrap leading-[1.15] transition-[color,opacity] duration-300 ${text.trim() ? 'opacity-100' : 'opacity-45'}`}
            style={{ fontFamily: family, fontSize: '11cqw', transform: `scale(${scale})`, ...INK[metal] }}>
            {shown}
          </span>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-mute">{d.engravingPreviewNote}</figcaption>
    </figure>
  )
}

/** Font choice, each tile written in its own font with the customer's text. */
export function EngravingFontPicker({ locale, text, value, onChange }: { locale: Locale; text: string; value: number; onChange: (id: number) => void }) {
  const d = t(locale)
  const sample = text.trim() || d.engravingSample
  return (
    <div>
      <p className="label">{d.engravingFont}</p>
      <div role="radiogroup" aria-label={d.engravingFont} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ENGRAVE_FONTS.map((f) => {
          const on = f.id === value
          return (
            <button key={f.id} type="button" role="radio" aria-checked={on} aria-label={`${d.engravingFont} ${f.id}`} onClick={() => onChange(f.id)}
              className={`relative flex h-16 min-w-0 items-center justify-center overflow-hidden border px-2 transition [container-type:inline-size] ${on ? 'border-flame bg-flame/10 text-bone' : 'border-line text-bone/75 hover:border-bone/50'}`}>
              <span className="absolute left-1.5 top-1 font-mono text-[9px] tracking-[0.1em] text-mute">{f.id}</span>
              {/* Long names shrink to the tile width instead of being cut off. */}
              <span className="block max-w-full truncate leading-tight" style={{ fontFamily: ENGRAVE_FONT_FAMILY[f.id], fontSize: `min(20px, ${Math.round(1800 / Math.max(sample.length, 1)) / 10}cqw)` }}>{sample}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
