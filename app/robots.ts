import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/blagajna', '/kosarica', '/narudzba', '/moj-racun', '/en/checkout', '/en/cart', '/en/order', '/en/account'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
