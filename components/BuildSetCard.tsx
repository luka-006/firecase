import Image from 'next/image'
import Link from 'next/link'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import { BUILD_SET_TIERS } from '@/lib/set-builder'

/** First tile of Kolekcija: opens "Napravi svoj set". Shows a few real case photos. */
export function BuildSetCard({ locale, images }: { locale: Locale; images: string[] }) {
  const d = t(locale)
  const top = Math.max(0, ...BUILD_SET_TIERS.map((tier) => tier.percent))
  const four = images.filter(Boolean).slice(0, 4)
  return (
    <Link href={href(locale, 'build')} className="group block min-w-0" data-reveal>
      <div className="frame aspect-[4/5]">
        <div className="frame-in">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-line">
            {four.map((src, i) => (
              <div key={i} className="relative overflow-hidden bg-ink-3">
                <Image src={src} alt="" fill sizes="(min-width:1024px) 15vw, 25vw" className="object-cover transition duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <span className="absolute left-2 top-2 bg-flame px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink sm:left-3 sm:top-3">-{top}%</span>
          <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
            <p className="h-display text-lg leading-tight sm:text-2xl">{d.buildSet}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-snug text-bone/75">{d.buildTiers(BUILD_SET_TIERS)}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-flame transition group-hover:text-flame-2">{d.buildCardCta} →</p>
    </Link>
  )
}
