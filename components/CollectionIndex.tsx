'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowIcon } from './icons'

export type IndexItem = { slug: string; href: string; name: string; short: string; price: string; image: string; sizes: string; badge?: string }

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
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`row-wipe group relative isolate grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:gap-5 lg:grid-cols-[3rem_minmax(0,1fr)_auto_1.5rem] lg:gap-6 lg:px-2 lg:py-8 ${i === active ? 'is-on' : ''}`}
            >
              <span className="hidden font-mono text-xs text-mute lg:block">{pad(i + 1)}</span>
              <span className="frame relative block aspect-square lg:hidden" style={{ ['--c' as string]: '10px' }}>
                <span className="frame-in">{it.image && <Image src={it.image} alt="" fill sizes="72px" className="object-cover" />}</span>
              </span>
              <span className="min-w-0">
                <span className="h-display block text-lg leading-[1.05] [overflow-wrap:anywhere] transition-colors duration-300 group-hover:text-flame sm:text-2xl lg:text-[2.1rem]">{it.name}</span>
                {it.short && <span className="mt-2 block truncate text-sm text-mute">{it.short}</span>}
                {it.badge && <span className="mt-2 inline-block max-w-full border border-flame/70 bg-ink px-1.5 py-0.5 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-flame sm:text-[10px]">{it.badge}</span>}
              </span>
              <span className="whitespace-nowrap text-right">
                <span className="block font-mono text-sm tabular-nums lg:text-base">{it.price}</span>
                {it.sizes && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{it.sizes}</span>}
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
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{pad(active + 1)} / {pad(items.length)}</p>
        </div>
      </div>
    </div>
  )
}
