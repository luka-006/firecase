import type { MetadataRoute } from 'next'
import { getActiveProducts } from '@/lib/products'
import { SITE_URL } from '@/lib/config'
import { href, LOCALES, type RouteKey } from '@/lib/routes'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const keys: RouteKey[] = ['home', 'shop', 'terms', 'privacy', 'cookies', 'shipping', 'returns', 'withdrawal', 'contact']
  const products = await getActiveProducts()
  return [
    ...keys.flatMap((k) => LOCALES.map((l) => ({ url: SITE_URL + href(l, k), changeFrequency: 'weekly' as const, priority: k === 'home' ? 1 : k === 'shop' ? 0.9 : 0.3, alternates: { languages: { hr: SITE_URL + href('hr', k), en: SITE_URL + href('en', k) } } }))),
    ...products.flatMap((p) => LOCALES.map((l) => ({ url: SITE_URL + href(l, 'product', p.slug), changeFrequency: 'weekly' as const, priority: 0.8, images: p.images.filter((i) => !i.endsWith('.svg')).map((i) => (i.startsWith('http') ? i : SITE_URL + i)), alternates: { languages: { hr: SITE_URL + href('hr', 'product', p.slug), en: SITE_URL + href('en', 'product', p.slug) } } }))),
  ]
}
