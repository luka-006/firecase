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

export function CookieNotice({ locale }: { locale: Locale }) {
  const [show, setShow] = useState(false)
  const d = t(locale)
  useEffect(() => {
    try { setShow(!localStorage.getItem('fc_cookie_ok')) } catch {}
  }, [])
  if (!show) return null
  return (
    <div className="page-in fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl rounded-2xl border border-line bg-ink-2/95 p-4 shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-4">
      <p className="text-xs leading-relaxed text-bone/75">
        {d.cookieText} <Link href={href(locale, 'cookies')} className="link">{d.more}</Link>
      </p>
      <button onClick={() => { try { localStorage.setItem('fc_cookie_ok', '1') } catch {}; setShow(false) }} className="btn btn-sm mt-3 shrink-0 sm:mt-0">{d.ok}</button>
    </div>
  )
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
