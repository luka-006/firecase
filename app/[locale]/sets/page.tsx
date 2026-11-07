import type { Metadata } from 'next'
import { ShopCatalogue } from '@/components/ShopCatalogue'
import { getActiveProducts } from '@/lib/products'
import { href, type Locale } from '@/lib/routes'
import { catalogueSets } from '@/lib/setovi'
import { t } from '@/lib/dict'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sort?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const l = locale as Locale
  return {
    title: t(l).sets,
    description: t(l).setsIntro,
    alternates: { canonical: href(l, 'sets'), languages: { hr: href('hr', 'sets'), en: href('en', 'sets'), 'x-default': href('hr', 'sets') } },
  }
}

export default async function SetsPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  const { sort } = await searchParams
  const sets = catalogueSets(await getActiveProducts())
  return <ShopCatalogue locale={locale} products={sets} sort={sort} mode="sets" />
}
