'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowIcon } from './icons'

/**
 * "Istražite kolekciju" pill that slides up from the bottom once the hero button has
 * scrolled out of view, and steps aside near the footer and while the cookie bar
 * covers the bottom of a phone screen.
 */
export function ScrollCta({ href, label, anchorId }: { href: string; label: string; anchorId: string }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const anchor = document.getElementById(anchorId)
      const pastHero = anchor ? anchor.getBoundingClientRect().bottom < 0 : window.scrollY > window.innerHeight * 0.6
      const footer = document.querySelector('footer')
      const nearEnd = footer ? footer.getBoundingClientRect().top < window.innerHeight - 40 : false
      const cookieBar = !!document.querySelector('[data-cookie-notice]') && window.innerWidth < 1024
      setOn(pastHero && !nearEnd && !cookieBar)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // the cookie bar opens and closes without a scroll
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mo.disconnect()
    }
  }, [anchorId])

  return (
    <div
      className={`scroll-cta pointer-events-none fixed inset-x-0 z-30 flex justify-center px-5 ${on ? 'is-on' : ''}`}
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      inert={!on}
    >
      <Link href={href} className="btn group pointer-events-auto" tabIndex={on ? 0 : -1}>
        {label}
        <ArrowIcon className="size-4 transition duration-500 group-hover:translate-x-1" />
      </Link>
    </div>
  )
}
