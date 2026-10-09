'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }) => string
      reset: (id?: string) => void
    }
  }
}

export function TurnstileField({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!siteKey || !ref.current) return
    const src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    const existing = document.querySelector(`script[src="${src}"]`)
    const boot = () => {
      if (!ref.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t) => onToken(t),
        'expired-callback': () => onToken(''),
      })
      setReady(true)
    }
    if (existing) {
      if (window.turnstile) boot()
      else existing.addEventListener('load', boot)
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = boot
    document.head.appendChild(s)
  }, [siteKey, onToken])

  if (!siteKey) {
    return <input type="hidden" name="cf-turnstile-response" value="dev-bypass" readOnly />
  }

  return (
    <>
      <div ref={ref} className="min-h-[65px]" />
      {!ready && <p className="text-xs text-mute">Učitavam provjeru…</p>}
    </>
  )
}
