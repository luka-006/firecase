'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowIcon, ShuffleIcon } from './icons'
import { interleaveSets, shuffle } from '@/lib/home-order'

export type IndexItem = {
  slug: string
  href: string
  name: string
  short: string
  price: string
  /** Crossed-out price when the item is on sale. */
  compare?: string
  image: string
  sizes: string
  badge?: string
  set?: boolean
  setLabel?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Homepage list. `items` is what the server rendered (a few of the collection, in this hour's order).
 * `pool` is every case and set: the shuffle button draws a fresh selection from it.
 */
export function CollectionIndex({
  items: initial,
  pool,
  heading,
  viewAll,
  shuffleLabel,
  shuffledLabel,
}: {
  items: IndexItem[]
  pool?: IndexItem[]
  heading?: React.ReactNode
  viewAll?: React.ReactNode
  shuffleLabel?: string
  shuffledLabel?: string
}) {
  const [items, setItems] = useState(initial)
  const [active, setActive] = useState(0)
  const [round, setRound] = useState(0)
  const canShuffle = !!pool && pool.length > 1 && !!shuffleLabel

  function reshuffle() {
    if (!pool) return
    const keep = initial.length
    let next = interleaveSets(shuffle(pool), keep)
    // never land on the exact same list twice in a row
    for (let i = 0; i < 4 && next.map((x) => x.slug).join() === items.map((x) => x.slug).join(); i++) next = interleaveSets(shuffle(pool), keep)
    setItems(next)
    setActive(0)
    setRound((r) => r + 1)
  }

  if (!items.length) return null
  return (
    <>
      {(heading || viewAll || canShuffle) && (
        <div className="mb-10 flex items-end justify-between gap-4" data-reveal>
          {heading}
          <div className="flex shrink-0 items-center gap-6">
            {canShuffle && (
              <button type="button" onClick={reshuffle} aria-label={shuffleLabel} className="group -m-2 inline-flex items-center gap-2.5 p-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:text-flame">
                <span key={round} className={`inline-flex ${round > 0 ? 'shuffle-spin' : ''}`}><ShuffleIcon className="size-5 transition-transform duration-500 group-hover:-rotate-12 sm:size-4" /></span>
                <span className="hidden sm:inline" aria-hidden="true">{shuffleLabel}</span>
              </button>
            )}
            {viewAll}
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{round > 0 ? shuffledLabel : ''}</p>
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
      <ul key={round} className="border-t border-line">
        {items.map((it, i) => (
          <li key={it.slug} className={`border-b border-line ${round > 0 ? 'shuffle-in' : ''}`} style={round > 0 ? { ['--d' as string]: `${i * 45}ms` } : undefined}>
            <Link
              href={it.href}
              data-home-kind={it.set ? 'set' : 'case'}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={it.set
                ? `group relative isolate my-3 grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-4 bg-ink-2 px-3 py-4 shadow-[inset_3px_0_0_0_#d08a2e] sm:grid-cols-[6.25rem_minmax(0,1fr)_auto] sm:px-5 sm:py-5 lg:grid-cols-[6.25rem_minmax(0,1fr)_auto_1.5rem] lg:px-4 ${i === active ? 'is-on' : ''}`
                : `row-wipe group relative isolate grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:gap-5 lg:grid-cols-[3rem_minmax(0,1fr)_auto_1.5rem] lg:gap-6 lg:px-2 lg:py-8 ${i === active ? 'is-on' : ''}`}
            >
              {it.set ? (
                <span className="frame relative block aspect-square" style={{ ['--c' as string]: '12px' }}>
                  <span className="frame-in">{it.image && <Image src={it.image} alt="" fill sizes="100px" className="object-cover" />}</span>
                </span>
              ) : (
                <>
                  <span className="hidden font-mono text-xs text-mute lg:block">{pad(i + 1)}</span>
                  <span className="frame relative block aspect-square lg:hidden" style={{ ['--c' as string]: '10px' }}>
                    <span className="frame-in">{it.image && <Image src={it.image} alt="" fill sizes="72px" className="object-cover" />}</span>
                  </span>
                </>
              )}
              <span className="min-w-0">
                {it.set && <span className="eyebrow mb-2 block text-[10px]">{it.setLabel || 'Set'}</span>}
                <span className={`h-display block leading-[1.05] [overflow-wrap:anywhere] transition-colors duration-300 group-hover:text-flame ${it.set ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl lg:text-[2.1rem]'}`}>{it.name}</span>
                {it.short && <span className="mt-2 block truncate text-sm text-mute">{it.short}</span>}
                {it.badge && <span className="mt-2 inline-block max-w-full border border-flame/70 bg-ink px-1.5 py-0.5 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-flame sm:text-[10px]">{it.badge}</span>}
              </span>
              <span className={`whitespace-nowrap text-right ${it.set ? 'col-span-2 sm:col-span-1' : ''}`}>
                <span className={`block font-mono tabular-nums ${it.compare ? 'text-flame-2' : ''} ${it.set ? 'text-base sm:text-lg' : 'text-sm lg:text-base'}`}>{it.price}</span>
                {it.compare && <span className="mt-0.5 block font-mono text-xs tabular-nums text-mute line-through">{it.compare}</span>}
                {!it.set && it.sizes && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{it.sizes}</span>}
              </span>
              <ArrowIcon className="hidden size-5 text-mute transition duration-500 group-hover:translate-x-1 group-hover:text-flame lg:block" />
            </Link>
          </li>
        ))}
      </ul>
      </div>
      <div className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28" data-reveal>
          <div className="frame aspect-square">
            <div className="frame-in">
              <div key={round} className="curtain absolute inset-0">
                {items.map((it, i) =>
                  it.image ? (
                    <Image key={it.slug} src={it.image} alt="" fill sizes="40vw" priority={i === 0}
                      className={`object-cover transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] ${i === active ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0'}`} />
                  ) : null,
                )}
              </div>
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            {items[active]?.set ? `${items[active].setLabel || 'Set'} · ` : ''}{pad(active + 1)} / {pad(items.length)}
          </p>
        </div>
      </div>
      </div>
    </>
  )
}
