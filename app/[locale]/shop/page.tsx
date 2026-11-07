import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueCases } from '@/lib/setovi'
import { t } from '@/lib/dict'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'en' ? 'Lighter cases – Collection' : 'Futrole za upaljače – Kolekcija',
    description: t(locale as Locale).shopIntro,
    alternates: { canonical: href(locale as Locale, 'shop'), languages: { hr: href('hr', 'shop'), en: href('en', 'shop'), 'x-default': href('hr', 'shop') } },
  }
}

export default async function Shop({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  const cases = catalogueCases(await getActiveProducts())
  return <ShopCatalogue locale={locale} products={cases} sort={sort} mode="cases" />
}
