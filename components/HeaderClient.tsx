'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from './CartProvider'
import { BagIcon, MenuIcon, XIcon } from './icons'
import { href, switchLocale, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function CartButton({ locale }: { locale: Locale }) {
  const { count, setOpen } = useCart()
  return (
    <button onClick={() => setOpen(true)} className="relative p-2 text-bone/80 transition hover:text-bone" aria-label={t(locale).cart}>
      <BagIcon />
      {count > 0 && (
        <span className="absolute -right-1 -top-0.5 grid min-w-[17px] place-items-center bg-flame px-1 font-mono text-[10px] font-medium leading-[17px] text-ink">{count}</span>
      )}
    </button>
  )
}

export function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const other: Locale = locale === 'hr' ? 'en' : 'hr'
  return (
    <Link href={switchLocale(pathname, other)} hrefLang={other} className="px-2 py-2 text-xs font-medium tracking-widest text-mute transition hover:text-bone">
      {other.toUpperCase()}
    </Link>
  )
}

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 ${scrolled ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent bg-ink/0'}`}>
      {children}
    </header>
  )
}

export function MobileMenu({ locale, links }: { locale: Locale; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const d = t(locale)
  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  const panel = (
      <div className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={`fade absolute inset-0 bg-black/70 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0'}`} />
        <nav className={`drawer absolute left-0 top-0 flex h-full w-[85%] max-w-xs flex-col gap-1 border-r border-line bg-ink p-6 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setOpen(false)} className="mb-6 self-end text-mute" aria-label={d.close}><XIcon /></button>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="h-display border-b border-line px-1 py-4 text-2xl transition hover:text-flame-2">{l.label}</Link>
          ))}
          <div className="mt-auto flex items-center gap-3 pt-4">
            <LangSwitch locale={locale} />
          </div>
        </nav>
      </div>
  )
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 text-bone/80 md:hidden" aria-label={d.menu}><MenuIcon /></button>
      {mounted && createPortal(panel, document.body)}
    </>
  )
}

