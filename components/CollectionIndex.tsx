'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowIcon } from './icons'

export type IndexItem = {
  slug: string
  href: string
  name: string
  short: string
  price: string
  image: string
  sizes: string
  badge?: string
  set?: boolean
  setLabel?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function CollectionIndex({ items }: { items: IndexItem[] }) {
  const [active, setActive] = useState(0)
  if (!items.length) return null
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
      <ul className="border-t border-line">
        {items.map((it, i) => (
          <li key={it.slug} className="border-b border-line">
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
                <span className={`block font-mono tabular-nums ${it.set ? 'text-base sm:text-lg' : 'text-sm lg:text-base'}`}>{it.price}</span>
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
              <div className="curtain absolute inset-0">
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
  )
}
