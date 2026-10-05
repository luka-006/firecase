import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BuyBox, Gallery } from '@/components/ProductClient'
import { ChevronIcon, ReturnIcon, TruckIcon } from '@/components/icons'
import { getActiveProducts, getProductBySlug } from '@/lib/products'
import { ProductCard } from '@/components/ProductCard'
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
    title: `${loc(p, 'name', l)} – ${l === 'en' ? 'lighter case' : 'futrola za upaljač'}`,
    description: loc(p, 'short', l) || t(l).shopIntro,
    openGraph: { images: p.images[0] ? [{ url: p.images[0] }] : undefined },
    alternates: { canonical: href(l, 'product', slug), languages: { hr: href('hr', 'product', slug), en: href('en', 'product', slug), 'x-default': href('hr', 'product', slug) } },
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: l, slug } = await params
  const locale = l as Locale
  const [p, s, all] = await Promise.all([getProductBySlug(slug), getSettings(), getActiveProducts()])
  if (!p) notFound()
  const d = t(locale)
  const related = all.filter((x) => x.id !== p.id).slice(0, 3)
  const name = loc(p, 'name', locale)
  const soldOut = p.stock !== null && p.stock <= 0
  const desc = loc(p, 'desc', locale)
  const material = loc(p, 'material', locale)
  const safety = loc(p, 'safety', locale)
  const delivery = locale === 'en' ? s.deliveryEn : s.deliveryHr
  const lowest = p.lowest30 ?? p.priceCents
  const img = (u: string) => (u.startsWith('http') ? u : SITE_URL + u)
  const days = (s.deliveryHr.match(/\d+/g) ?? ['3', '7']).map(Number)
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'Product', name, image: p.images.map(img), description: loc(p, 'short', locale) || desc.slice(0, 300),
    sku: p.sku || String(p.id), brand: { '@type': 'Brand', name: 'Firecase' }, category: locale === 'en' ? 'Lighter cases' : 'Futrole za upaljače',
    offers: {
      '@type': 'Offer', priceCurrency: 'EUR', price: (p.priceCents / 100).toFixed(2), url: SITE_URL + href(locale, 'product', p.slug),
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: (p.priceCents >= s.freeThresholdCents ? 0 : s.shippingCents / 100).toFixed(2), currency: 'EUR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'HR' },
        deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: days[0], maxValue: days[1] ?? days[0], unitCode: 'DAY' } },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy', applicableCountry: 'HR', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      },
    },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Firecase', item: SITE_URL + href(locale, 'home') },
      { '@type': 'ListItem', position: 2, name: d.allCases, item: SITE_URL + href(locale, 'shop') },
      { '@type': 'ListItem', position: 3, name, item: SITE_URL + href(locale, 'product', p.slug) },
    ],
  }]
  const Row = ({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) => (
    <details className="group border-b border-line py-5" open={open}>
      <summary className="flex items-center justify-between font-mono text-xs font-medium uppercase tracking-[0.16em]">{title}<ChevronIcon className="size-4 text-mute transition duration-300 group-open:rotate-180" /></summary>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mute">{children}</div>
    </details>
  )

  return (
    <div className="container-x pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="mb-8 text-xs text-mute"><Link href={href(locale, 'shop')} className="hover:text-bone">{d.allCases}</Link> <span className="mx-1.5">/</span> {name}</nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} alt={name} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Firecase</p>
          <h1 className="h-display mt-4 text-3xl leading-[1.02] sm:text-5xl">{name}</h1>
          <div className="mt-5 flex items-baseline gap-3">
            <span className={`font-mono text-2xl tabular-nums ${p.compareCents ? 'text-flame-2' : ''}`}>{money(p.priceCents, locale)}</span>
            {p.compareCents && <span className="text-mute line-through tabular-nums">{money(p.compareCents, locale)}</span>}
          </div>
          {p.compareCents && <p className="mt-1 text-xs text-mute">{d.lowest30}: {money(lowest, locale)}</p>}
          {loc(p, 'short', locale) && <p className="mt-6 leading-relaxed text-bone/70">{loc(p, 'short', locale)}</p>}
          <div className="mt-8">
            <BuyBox locale={locale} product={{ id: p.id, slug: p.slug, nameHr: p.nameHr, nameEn: p.nameEn, image: p.images[0] ?? '', priceCents: p.priceCents, variants: p.variants, soldOut }} />
          </div>
          <div className="mt-8 grid gap-3 text-sm text-bone/75">
            <p className="flex items-center gap-3"><TruckIcon className="size-5 text-flame" />{d.deliveryTime}: {delivery} · {d.freeOver(money(s.freeThresholdCents, locale))}</p>
            <p className="flex items-center gap-3"><ReturnIcon className="size-5 text-flame" />{d.ret14}</p>
          </div>
          <div className="mt-8 border-t border-line">
            {desc && <Row title={d.description} open>{desc}</Row>}
            {(material || p.sku) && (
              <Row title={d.details}>
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
      {related.length > 0 && (
        <section className="pt-28 md:pt-40">
          <h2 className="h-display mb-10 text-3xl leading-none sm:text-5xl" data-reveal>{d.related}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
            {related.map((r, i) => <ProductCard key={r.id} p={r} locale={locale} delay={i * 90} />)}
          </div>
        </section>
      )}
    </div>
  )
}
