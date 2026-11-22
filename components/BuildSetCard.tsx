import Link from 'next/link'
import { ArrowIcon } from './icons'
import { SetShowcase } from './SetShowcase'
import { t } from '@/lib/dict'
import { href, type Locale } from '@/lib/routes'
import { BUILD_SET_TIERS } from '@/lib/set-builder'

/** PNG case photos are usually cut-outs on a transparent background, so they go first on the dark block. */
export function cutoutsFirst(images: string[]) {
  const cut = (src: string) => /\.png($|\?)/i.test(src)
  return [...images.filter(Boolean)].sort((a, b) => Number(cut(b)) - Number(cut(a)))
}

/**
 * Feature block that opens "Napravi svoj set". Spans the whole Kolekcija grid (first item) and is reused
 * on the homepage. The right side shows real case photos dropping into a set while the tiers light up.
 */
export function BuildSetCard({ locale, images, variant = 'shop' }: { locale: Locale; images: string[]; variant?: 'shop' | 'home' }) {
  const d = t(locale)
  const top = Math.max(0, ...BUILD_SET_TIERS.map((tier) => tier.percent))
  const home = variant === 'home'
  // On the homepage the section heading already says "Napravi svoj set", so the block leads with the discount.
  const title = home ? d.buildUpTo(top) : d.buildSet
  const Title = home ? 'h3' : 'h2'
  const cta = (
    <span className="btn group-hover:bg-flame">
      {d.buildCardCta}
      <ArrowIcon className="size-4 transition duration-500 group-hover:translate-x-1" />
    </span>
  )
  return (
    <Link href={href(locale, 'build')} className="group col-span-2 block min-w-0 lg:col-span-3" data-reveal data-build-feature>
      <div className="frame" style={{ ['--c' as string]: '26px' }}>
        <div className="frame-in relative inset-auto m-px overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_88%_18%,rgb(208_138_46/0.16),transparent_70%)]" />
          <div aria-hidden className="gridlines pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative grid gap-9 p-5 sm:p-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-12">
            <div className="lg:col-span-5">
              <p className="flex items-center gap-3">
                <span className="sale-tag bg-flame px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink">{d.buildNew}</span>
                {!home && <span className="eyebrow">{d.buildUpTo(top)}</span>}
              </p>
              <Title className="h-display mt-5 text-[2.6rem] leading-[0.92] transition-colors duration-300 group-hover:text-flame-2 sm:text-6xl">{title}</Title>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-bone/65">{d.buildCardText}</p>
              <div className="mt-9 hidden lg:block">{cta}</div>
            </div>
            <div className="lg:col-span-7">
              <SetShowcase locale={locale} images={images} />
            </div>
            <div className="lg:hidden [&>span]:w-full">{cta}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
