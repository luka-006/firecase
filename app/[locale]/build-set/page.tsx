import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { SetBuilder, type BuilderCase } from '@/components/SetBuilder'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { buildableCase } from '@/lib/set-builder'
import { lighterModels, listingMeta } from '@/lib/seo'
import { withLowStockFirst } from '@/lib/stock'
import { publicVariants } from '@/lib/variants'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = (await params).locale as Locale
  return {
    ...listingMeta('build', l),
    alternates: { canonical: href(l, 'build'), languages: { hr: href('hr', 'build'), en: href('en', 'build'), 'x-default': href('hr', 'build') } },
  }
}

export default async function BuildSetPage({ params }: Props) {
  const locale = (await params).locale as Locale
  const products = (await getActiveProducts()).filter(buildableCase)
  // Only public fields reach the browser: no supplier links, options or costs.
  const cases: BuilderCase[] = withLowStockFirst(products).map((p) => ({
    id: p.id,
    slug: p.slug,
    nameHr: p.nameHr,
    nameEn: p.nameEn,
    image: p.images[0] ?? '',
    priceCents: p.priceCents,
    variants: publicVariants(p.variants),
    stock: p.stock,
    models: lighterModels([p.fits, p.nameHr, p.shortHr]),
  }))
  return <ShopCatalogue locale={locale} products={products} mode="build" builder={<SetBuilder locale={locale} cases={cases} />} />
}
