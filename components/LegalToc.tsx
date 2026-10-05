'use client'
import { useEffect, useState } from 'react'

// Sadržaj pravnih stranica, s oznakom trenutnog odjeljka
export function LegalToc({ label }: { label: string }) {
  const [items, setItems] = useState<{ id: string; text: string }[]>([])
  const [active, setActive] = useState('')
  useEffect(() => {
    const hs = Array.from(document.querySelectorAll<HTMLHeadingElement>('.prose-legal h2'))
    hs.forEach((h, i) => { if (!h.id) h.id = `s${i + 1}` })
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? '' })))
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '0px 0px -70% 0px' })
    hs.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [])
  if (items.length < 3) return null
  return (
    <nav aria-label={label} className="sticky top-28 hidden self-start lg:block">
      <p className="label mb-4">{label}</p>
      <ul className="space-y-1 border-l border-line">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={`-ml-px block border-l py-1 pl-4 text-[13px] leading-snug transition ${active === it.id ? 'border-flame text-bone' : 'border-transparent text-mute hover:text-bone'}`}>{it.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
