import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { EngraverShop, type EngraverCase } from '@/components/EngraverShop'
import { catalogueEngravers } from '@/lib/engrave'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { listingMeta } from '@/lib/seo'
import { money } from '@/lib/money'
import { isSoldOut, withLowStockFirst } from '@/lib/stock'
import { publicVariants } from '@/lib/variants'
import { loc } from '@/lib/types'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const l = locale as Locale
  // An empty tab is a thin page: keep it out of Google until at least one case has Gravura on.
  const empty = catalogueEngravers(await getActiveProducts()).length === 0
  return {
    ...listingMeta('engraver', l),
    robots: empty ? { index: false, follow: true } : undefined,
    alternates: { canonical: href(l, 'engraver'), languages: { hr: href('hr', 'engraver'), en: href('en', 'engraver'), 'x-default': href('hr', 'engraver') } },
  }
}

export default async function EngraverPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  const products = catalogueEngravers(await getActiveProducts())
  const cases: EngraverCase[] = withLowStockFirst(products).map((p) => ({
    slug: p.slug,
    name: loc(p, 'name', locale),
    price: money(p.priceCents, locale),
    thumb: p.images[0] ?? '',
    href: href(locale, 'product', p.slug),
    buy: { id: p.id, slug: p.slug, nameHr: p.nameHr, nameEn: p.nameEn, image: p.images[0] ?? '', priceCents: p.priceCents, variants: publicVariants(p.variants), stock: isSoldOut(p) ? 0 : p.stock, freeShipping: p.freeShipping, engrave: true },
  }))
  return (
    <ShopCatalogue locale={locale} products={products} sort={sort} mode="engraver"
      engraver={<EngraverShop locale={locale} cases={cases} banner="/engrave/gravura.jpg" />} />
  )
}
