import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueCases } from '@/lib/setovi'
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
  const cases = catalogueCases(await getActiveProducts())
  return <ShopCatalogue locale={locale} products={cases} sort={sort} mode="cases" />
}
