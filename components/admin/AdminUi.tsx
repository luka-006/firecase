'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const LINKS: [string, string][] = [['/admin', 'Pregled'], ['/admin/prijedlozi', 'Prijedlozi'], ['/admin/orders', 'Narudžbe'], ['/admin/reviews', 'Recenzije'], ['/admin/products', 'Proizvodi'], ['/admin/invoices', 'Računi'], ['/admin/settings', 'Postavke']]

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
    <select value={sp.get('status') ?? ''} onChange={(e) => router.push(e.target.value ? `/admin/orders?status=${e.target.value}` : '/admin/orders')} className="input w-full min-w-0 sm:w-auto sm:min-w-80">
      {options.map(([v, l, n]) => <option key={v} value={v}>{l}{typeof n === 'number' ? ` (${n})` : ''}</option>)}
    </select>
  )
}

