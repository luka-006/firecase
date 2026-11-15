import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { catalogueEngravers } from '@/lib/engrave'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { listingMeta } from '@/lib/seo'

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
  return <ShopCatalogue locale={locale} products={products} sort={sort} mode="engraver" />
}
