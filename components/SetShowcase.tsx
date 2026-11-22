'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { SET_STEPS, SetLadder } from './SetLadder'
import { builtSetPercent } from '@/lib/set-builder'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'

const pad2 = (n: number) => String(n).padStart(2, '0')
const SLOTS = SET_STEPS[SET_STEPS.length - 1].min

/**
 * Cases drop into a set one by one the first time the block comes into view, then the full set stays.
 * With reduced motion it shows the full set straight away.
 */
export function SetShowcase({ locale, images }: { locale: Locale; images: string[] }) {
  const d = t(locale)
  const pics = images.filter(Boolean)
  const [n, setN] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasPics = pics.length > 0

  useEffect(() => {
    const el = ref.current
    if (!el || !hasPics) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(SLOTS)
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    let count = 0
    const step = () => {
      count += 1
      setN(count)
      if (count < SLOTS) timer = setTimeout(step, 380)
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      timer = setTimeout(step, 300)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [hasPics])

  const percent = builtSetPercent(n)
  return (
    <div ref={ref} className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2 font-mono tabular-nums">
          <span className="h-display text-4xl leading-none text-bone sm:text-5xl">{pad2(n)}</span>
          <span className="text-xs text-mute">/ {pad2(SLOTS)}</span>
        </p>
        <p className="h-[1.1em] text-right font-display text-3xl font-semibold leading-none text-flame-2 sm:text-4xl" aria-hidden>
          {percent > 0 && `−${percent}%`}
        </p>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:grid-cols-8" aria-label={d.buildTray}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const filled = i < n
          const src = pics.length ? pics[i % pics.length] : ''
          return (
            <li key={i} className="frame relative aspect-square" style={{ ['--c' as string]: '9px' }}>
              <div className="frame-in bg-[radial-gradient(75%_65%_at_50%_42%,#222_0%,#141414_70%)]">
                <span className="absolute inset-0 grid place-items-center font-mono text-[10px] tabular-nums text-mute/40">{i + 1}</span>
                {src && (
                  <span className="showcase-case absolute inset-0" data-state={filled ? 'in' : 'wait'}>
                    <Image src={src} alt="" fill sizes="(min-width:1024px) 90px, 22vw" className="object-contain p-1" />
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-6">
        <SetLadder locale={locale} count={n} />
      </div>
    </div>
  )
}
