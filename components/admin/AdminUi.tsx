'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const LINKS: [string, string][] = [['/admin', 'Pregled'], ['/admin/prijedlozi', 'Prijedlozi'], ['/admin/orders', 'Narudžbe'], ['/admin/products', 'Proizvodi'], ['/admin/invoices', 'Računi'], ['/admin/settings', 'Postavke']]

// Glavni izbornik: na računalu tabovi, na mobitelu padajući izbornik
export function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const isActive = (h: string) => (h === '/admin' ? pathname === '/admin' : pathname.startsWith(h))
  const current = LINKS.find(([h]) => isActive(h))?.[1] ?? 'Izbornik'
  return (
    <>
      <nav className="hidden gap-1 md:flex">
        {LINKS.map(([h, l]) => (
          <Link key={h} href={h} className={`px-3 py-2 text-sm transition ${isActive(h) ? 'bg-ink-3 text-bone' : 'text-bone/60 hover:text-bone'}`}>{l}</Link>
        ))}
      </nav>
      <div className="relative md:hidden">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 border border-line px-3 py-2 text-sm" aria-expanded={open}>
          {current} <span className={`text-mute transition ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {open && (
          <div className="absolute left-0 top-full z-40 mt-1 w-48 border border-line bg-ink-2 py-1 shadow-2xl">
            {LINKS.map(([h, l]) => (
              <Link key={h} href={h} className={`block px-4 py-2.5 text-sm ${isActive(h) ? 'text-flame' : 'text-bone/80'}`}>{l}</Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// Padajući filter koji mijenja ?status= u adresi
export function StatusFilter({ options }: { options: [string, string, number?][] }) {
  const router = useRouter()
  const sp = useSearchParams()
  return (
    <select value={sp.get('status') ?? ''} onChange={(e) => router.push(e.target.value ? `/admin/orders?status=${e.target.value}` : '/admin/orders')} className="input w-auto min-w-56">
      {options.map(([v, l, n]) => <option key={v} value={v}>{l}{typeof n === 'number' ? ` (${n})` : ''}</option>)}
    </select>
  )
}

// Polje s gumbom za kopiranje (adresa kupca za AliExpress)
export function CopyField({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" disabled={!value}
      onClick={async () => { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200) }}
      className="group flex w-full items-center justify-between gap-3 border-b border-line py-2.5 text-left disabled:opacity-50">
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{label}</span>
        <span className="block break-words text-sm">{value || '—'}</span>
      </span>
      <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] transition ${ok ? 'text-emerald-400' : 'text-mute group-hover:text-flame'}`}>{ok ? 'Kopirano' : 'Kopiraj'}</span>
    </button>
  )
}
