'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useActionState } from 'react'
import { useCart } from './CartProvider'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import Link from 'next/link'

// Pokreće "reveal" animacije za elemente s data-reveal
export function Reveal() {
  const pathname = usePathname()
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)')
    if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'))
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [pathname])
  return null
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const CONSENT_KEY = 'fc_consent'

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

function loadGA() {
  if (!GA_ID || window.gtag) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer!.push(arguments) } // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

function clearGACookies() {
  const host = location.hostname.replace(/^www\./, '')
  document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n.startsWith('_ga')).forEach((n) => {
    for (const domain of ['', `; domain=.${host}`]) document.cookie = `${n}=; Max-Age=0; path=/${domain}`
  })
}

// Obavijest o kolačićima; Google Analytics se učitava samo uz privolu
export function CookieNotice({ locale }: { locale: Locale }) {
  const [show, setShow] = useState(false)
  const d = t(locale)
  useEffect(() => {
    let choice: string | null = null
    try { choice = localStorage.getItem(CONSENT_KEY) } catch {}
    if (choice === 'all') loadGA()
    setShow(!choice)
    const open = () => setShow(true)
    window.addEventListener('fc:consent', open)
    return () => window.removeEventListener('fc:consent', open)
  }, [])
  const choose = (v: 'all' | 'necessary') => {
    try { localStorage.setItem(CONSENT_KEY, v) } catch {}
    if (v === 'all') loadGA()
    else clearGACookies()
    setShow(false)
  }
  if (!show) return null
  return (
    <div role="dialog" aria-label={d.cookieSettings} className="page-in fixed inset-x-4 bottom-4 z-40 mx-auto max-w-2xl border border-line bg-ink/95 p-5 shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-6">
      <p className="text-xs leading-relaxed text-bone/70">
        {GA_ID ? d.cookieText : d.cookieTextBasic} <Link href={href(locale, 'cookies')} className="link">{d.more}</Link>
      </p>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        {GA_ID ? (
          <>
            <button onClick={() => choose('necessary')} className="btn-ghost btn-sm">{d.rejectAll}</button>
            <button onClick={() => choose('all')} className="btn btn-sm">{d.acceptAll}</button>
          </>
        ) : (
          <button onClick={() => choose('necessary')} className="btn btn-sm">{d.ok}</button>
        )}
      </div>
    </div>
  )
}

export function CookieSettingsButton({ label }: { label: string }) {
  return <button onClick={() => window.dispatchEvent(new Event('fc:consent'))} className="transition hover:text-bone">{label}</button>
}

export function ClearCart() {
  const { clear } = useCart()
  useEffect(() => clear(), [clear])
  return null
}

type State = { error?: string; ok?: string } | null
export function ActionForm({
  action, children, submit, className, locale, danger,
}: {
  action: (s: State, f: FormData) => Promise<State>
  children?: React.ReactNode
  submit: string
  className?: string
  locale?: Locale
  danger?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className={className ?? 'space-y-4'}>
      {locale && <input type="hidden" name="locale" value={locale} />}
      {children}
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-emerald-400">{state.ok}</p>}
      <button className={danger ? 'btn-ghost w-full border-red-900 text-red-300 hover:border-red-500' : 'btn w-full'} disabled={pending}>
        {pending ? '…' : submit}
      </button>
    </form>
  )
}

export function Field({ label, name, type = 'text', required, defaultValue, autoComplete, hint, ...rest }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; autoComplete?: string; hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}{required && ' *'}</span>
      <input className="input" name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} {...rest} />
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  )
}
