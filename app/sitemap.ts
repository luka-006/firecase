import type { MetadataRoute } from 'next'
import { getActiveProducts } from '@/lib/products'
import { catalogueEngravers } from '@/lib/engrave'
import { SITE_URL } from '@/lib/config'
import { href, LOCALES, type RouteKey } from '@/lib/routes'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts()
  // The Engraver tab is noindex while it has no cases, so it stays out of the sitemap too.
  const hasEngravers = catalogueEngravers(products).length > 0
  const keys: RouteKey[] = ['home', 'shop', 'sets', ...(hasEngravers ? (['engraver'] as RouteKey[]) : []), 'terms', 'privacy', 'cookies', 'shipping', 'returns', 'withdrawal', 'contact']
  return [
    ...keys.flatMap((k) => LOCALES.map((l) => ({ url: SITE_URL + href(l, k), changeFrequency: 'weekly' as const, priority: k === 'home' ? 1 : k === 'shop' ? 0.9 : 0.3, alternates: { languages: { hr: SITE_URL + href('hr', k), en: SITE_URL + href('en', k) } } }))),
    ...products.flatMap((p) => LOCALES.map((l) => ({ url: SITE_URL + href(l, 'product', p.slug), changeFrequency: 'weekly' as const, priority: 0.8, images: p.images.filter((i) => !i.endsWith('.svg')).map((i) => (i.startsWith('http') ? i : SITE_URL + i)), alternates: { languages: { hr: SITE_URL + href('hr', 'product', p.slug), en: SITE_URL + href('en', 'product', p.slug) } } }))),
    { url: SITE_URL + href('hr', 'contest'), changeFrequency: 'weekly' as const, priority: 0.3 },
  ]
}
