import type { Metadata } from 'next'
import { BuildSetCard, cutoutsFirst } from '@/components/BuildSetCard'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueCases, catalogueSets } from '@/lib/setovi'
import { SINGLE_CASES_FOR_SALE, buildableCase } from '@/lib/set-builder'
import { hourSeed, seededRandom, shuffle } from '@/lib/home-order'
import { catalogueEngravers } from '@/lib/engrave'
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
  // Kolekcija lists sets in an order that changes every hour. Single cases are picked in the builder,
  // and while they are for sale on their own they follow the sets here too.
  const sets = shuffle(catalogueSets(products), seededRandom(hourSeed()))
  const plain = catalogueCases(products).filter(buildableCase)
  const photos = cutoutsFirst(shuffle(plain, seededRandom(hourSeed() + 1)).map((p) => p.images[0] ?? ''))
  const cases = SINGLE_CASES_FOR_SALE ? shuffle(plain, seededRandom(hourSeed() + 2)) : []
  return <ShopCatalogue locale={locale} products={[...sets, ...cases]} sort={sort} mode={cases.length ? 'cases' : 'sets'} lead={<BuildSetCard locale={locale} images={photos} />} engraverTab={catalogueEngravers(products).length > 0} />
}
