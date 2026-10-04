import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BuyBox, Gallery } from '@/components/ProductClient'
import { ChevronIcon, ReturnIcon, TruckIcon } from '@/components/icons'
import { getProductBySlug } from '@/lib/products'
import { getSettings } from '@/lib/settings'
import { money } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { loc } from '@/lib/types'
import { t } from '@/lib/dict'
import { SITE_URL } from '@/lib/config'

export const revalidate = 300
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) return {}
  const l = locale as Locale
  return {
    title: loc(p, 'name', l),
    description: loc(p, 'short', l) || undefined,
    openGraph: { images: p.images[0] ? [{ url: p.images[0] }] : undefined },
    alternates: { canonical: href(l, 'product', slug), languages: { hr: href('hr', 'product', slug), en: href('en', 'product', slug) } },
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: l, slug } = await params
  const locale = l as Locale
  const [p, s] = await Promise.all([getProductBySlug(slug), getSettings()])
  if (!p) notFound()
  const d = t(locale)
  const name = loc(p, 'name', locale)
  const soldOut = p.stock !== null && p.stock <= 0
  const desc = loc(p, 'desc', locale)
  const material = loc(p, 'material', locale)
  const safety = loc(p, 'safety', locale)
  const delivery = locale === 'en' ? s.deliveryEn : s.deliveryHr
  const lowest = p.lowest30 ?? p.priceCents
  const img = (u: string) => (u.startsWith('http') ? u : SITE_URL + u)
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name, image: p.images.map(img), description: loc(p, 'short', locale),
    sku: p.sku || undefined, brand: { '@type': 'Brand', name: 'Firecase' },
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (p.priceCents / 100).toFixed(2), url: SITE_URL + href(locale, 'product', p.slug),
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
  }
  const Row = ({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) => (
    <details className="group border-b border-line py-5" open={open}>
      <summary className="flex items-center justify-between text-sm font-medium">{title}<ChevronIcon className="size-4 text-mute transition duration-300 group-open:rotate-180" /></summary>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mute">{children}</div>
    </details>
  )

  return (
    <div className="container-x pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="mb-8 text-xs text-mute"><Link href={href(locale, 'shop')} className="hover:text-bone">{d.shop}</Link> <span className="mx-1.5">/</span> {name}</nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} alt={name} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          {p.fits && <p className="eyebrow">{d.fits}: {p.fits}</p>}
          <h1 className="h-display mt-4 text-3xl leading-tight sm:text-4xl">{name}</h1>
          <div className="mt-5 flex items-baseline gap-3">
            <span className={`text-2xl tabular-nums ${p.compareCents ? 'text-flame-2' : ''}`}>{money(p.priceCents, locale)}</span>
            {p.compareCents && <span className="text-mute line-through tabular-nums">{money(p.compareCents, locale)}</span>}
          </div>
          {p.compareCents && <p className="mt-1 text-xs text-mute">{d.lowest30}: {money(lowest, locale)}</p>}
          {loc(p, 'short', locale) && <p className="mt-6 leading-relaxed text-bone/70">{loc(p, 'short', locale)}</p>}
          <div className="mt-8">
            <BuyBox locale={locale} product={{ id: p.id, slug: p.slug, nameHr: p.nameHr, nameEn: p.nameEn, image: p.images[0] ?? '', priceCents: p.priceCents, variants: p.variants, soldOut }} />
          </div>
          <div className="mt-8 grid gap-3 text-sm text-bone/75">
            <p className="flex items-center gap-3"><TruckIcon className="size-5 text-flame" />{d.deliveryTime}: {delivery} · {d.freeOver(money(s.freeThresholdCents, locale))}</p>
            <p className="flex items-center gap-3"><ReturnIcon className="size-5 text-flame" />{d.valueRetT}</p>
          </div>
          <div className="mt-8 border-t border-line">
            {desc && <Row title={d.description} open>{desc}</Row>}
            {(material || p.sku || p.fits) && (
              <Row title={d.details}>
                {p.fits && <>{d.fits}: {p.fits}{'\n'}</>}
                {material && <>{d.material}: {material}{'\n'}</>}
                {p.sku && <>{d.sku}: {p.sku}</>}
              </Row>
            )}
            <Row title={d.productSafety}>
              {p.manufacturer && <>{d.manufacturer}: {p.manufacturer}{'\n'}</>}
              {p.euResponsible && <>{d.euResponsible}: {p.euResponsible}{'\n'}</>}
              {safety ? <>{d.safetyInfo}: {safety}</> : null}
              {!p.manufacturer && !p.euResponsible && !safety && '—'}
            </Row>
          </div>
        </div>
      </div>
    </div>
  )
}
