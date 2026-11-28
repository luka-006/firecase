import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { Analytics } from '@vercel/analytics/next'
import '../globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartProvider } from '@/components/CartProvider'
import { CartDrawer } from '@/components/CartDrawer'
import { CookieNotice } from '@/components/Ui'
import { isLocale, LOCALES, type Locale } from '@/lib/routes'
import { getSettings } from '@/lib/settings'
import { getActiveProducts } from '@/lib/products'
import { catalogueEngravers } from '@/lib/engrave'
import { SITE_URL } from '@/lib/config'
import { euros } from '@/lib/money'
import { t } from '@/lib/dict'
import { baseOpenGraph, siteDescription } from '@/lib/seo'

export const viewport: Viewport = { themeColor: '#0a0a0a', colorScheme: 'dark' }

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  const s = await getSettings()
  const amount = euros(s.freeThresholdCents, en ? 'en' : 'hr')
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: en ? 'Firecase – Lighter cases' : 'Firecase – Futrole za upaljače', template: '%s | Firecase' },
    description: siteDescription(en ? 'en' : 'hr', amount),
    keywords: en ? ['lighter case', 'lighter cover', 'BIC lighter case', 'Firecase'] : ['futrola za upaljač', 'futrole za upaljače', 'navlaka za upaljač', 'futrola za BIC upaljač', 'Firecase'],
    openGraph: { ...baseOpenGraph(en ? 'en' : 'hr'), images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Firecase' }] },
    verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
    twitter: { card: 'summary_large_image' },
    manifest: '/site.webmanifest',
  }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const s = await getSettings()
  const announcement = (locale === 'en' ? s.announcementEn : s.announcementHr) || t(locale).freeOver(euros(s.freeThresholdCents, locale))
  // The Engraver link shows only while an engraving case is published.
  const engraver = catalogueEngravers(await getActiveProducts()).length > 0
  return (
    <html lang={locale}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preload" href="/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/archivo-latin-expanded.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-svh">
        <CartProvider shipping={{ shippingCents: s.shippingCents, freeThresholdCents: s.freeThresholdCents }}>
          <Header locale={locale} announcement={announcement} engraver={engraver} />
          {children}
          <Footer locale={locale} engraver={engraver} />
          <CartDrawer locale={locale} />
          <CookieNotice locale={locale} />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
