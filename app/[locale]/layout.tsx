import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { Analytics } from '@vercel/analytics/next'
import '../globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartProvider } from '@/components/CartProvider'
import { CartDrawer } from '@/components/CartDrawer'
import { CookieNotice, Reveal } from '@/components/Ui'
import { isLocale, LOCALES, type Locale } from '@/lib/routes'
import { getSettings } from '@/lib/settings'
import { SITE_URL } from '@/lib/config'
import { money } from '@/lib/money'
import { t } from '@/lib/dict'

export const viewport: Viewport = { themeColor: '#0a0a0a', colorScheme: 'dark' }

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: en ? 'Firecase – Lighter cases' : 'Firecase – Futrole za upaljače', template: '%s | Firecase' },
    description: en
      ? 'Lighter cases with delivery across Croatia. Free shipping on orders over €30 and 14 days to return.'
      : 'Futrole za upaljače s dostavom po cijeloj Hrvatskoj. Besplatna dostava za narudžbe iznad 30 € i 14 dana za povrat.',
    keywords: en ? ['lighter case', 'lighter cover', 'BIC lighter case', 'Firecase'] : ['futrola za upaljač', 'futrole za upaljače', 'navlaka za upaljač', 'futrola za BIC upaljač', 'Firecase'],
    openGraph: { type: 'website', siteName: 'Firecase', locale: en ? 'en_US' : 'hr_HR', alternateLocale: en ? 'hr_HR' : 'en_US', images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Firecase' }] },
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
  const announcement = (locale === 'en' ? s.announcementEn : s.announcementHr) || t(locale).freeOver(money(s.freeThresholdCents, locale))
  return (
    <html lang={locale}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preload" href="/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/archivo-latin-expanded.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-svh">
        <CartProvider shipping={{ shippingCents: s.shippingCents, freeThresholdCents: s.freeThresholdCents }}>
          <Header locale={locale} announcement={announcement} />
          {children}
          <Footer locale={locale} />
          <CartDrawer locale={locale} />
          <CookieNotice locale={locale} />
        </CartProvider>
        <Reveal />
        <Analytics />
      </body>
    </html>
  )
}
