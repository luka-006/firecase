import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueSets } from '@/lib/setovi'
import { listingMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

// Sets now live in Kolekcija (/trgovina). Set to false to bring this page back as it was.
// Temporary redirect, so browsers do not remember it if it is undone.
const SETS_IN_KOLEKCIJA = true

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const l = locale as Locale
  return {
    ...listingMeta('sets', l),
    alternates: { canonical: href(l, 'sets'), languages: { hr: href('hr', 'sets'), en: href('en', 'sets'), 'x-default': href('hr', 'sets') } },
  }
}

export default async function SetsPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  if (SETS_IN_KOLEKCIJA) redirect(href(locale, 'shop', undefined, sort ? `sort=${encodeURIComponent(sort)}` : undefined))
  const sets = catalogueSets(await getActiveProducts())
  return <ShopCatalogue locale={locale} products={sets} sort={sort} mode="sets" />
}
