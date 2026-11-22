import type { Metadata } from 'next'
import { BuildSetCard } from '@/components/BuildSetCard'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueCases, catalogueSets } from '@/lib/setovi'
import { buildableCase } from '@/lib/set-builder'
import { hourSeed, seededRandom, shuffle } from '@/lib/home-order'
import { listingMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    ...listingMeta('shop', locale as Locale),
    alternates: { canonical: href(locale as Locale, 'shop'), languages: { hr: href('hr', 'shop'), en: href('en', 'shop'), 'x-default': href('hr', 'shop') } },
  }
}

export default async function Shop({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  const products = await getActiveProducts()
  // Kolekcija lists sets in an order that changes every hour. Single cases are picked in the builder.
  const sets = shuffle(catalogueSets(products), seededRandom(hourSeed()))
  const photos = shuffle(catalogueCases(products).filter(buildableCase), seededRandom(hourSeed() + 1)).map((p) => p.images[0] ?? '')
  return <ShopCatalogue locale={locale} products={sets} sort={sort} mode="sets" lead={<BuildSetCard locale={locale} images={photos} />} />
}
