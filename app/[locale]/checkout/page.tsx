import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/CheckoutForm'
import { getUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { EU_COUNTRIES } from '@/lib/config'
import type { Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import { PageHead } from '@/components/PageHead'

export const metadata: Metadata = { title: 'Blagajna · Checkout', robots: { index: false } }

export default async function Checkout({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const [s, user] = await Promise.all([getSettings(), getUser()])
  let defaults: Record<string, string> = {}
  if (user) {
    const [u] = await sql<Record<string, string>[]>`select name, email, phone, address, city, postal, country from users where id = ${user.id}`
    defaults = u ?? {}
  }
  const names = new Intl.DisplayNames([locale], { type: 'region' })
  const codes = s.shipEu ? EU_COUNTRIES : ['HR']
  const countries = codes.map((c) => ({ code: c, name: names.of(c) ?? c })).sort((a, b) => (a.code === 'HR' ? -1 : b.code === 'HR' ? 1 : a.name.localeCompare(b.name)))
  return (
    <>
    <PageHead eyebrow={t(locale).footerShop} title={t(locale).checkout} />
    <div className="container-x">
      <CheckoutForm locale={locale} defaults={defaults} loggedIn={!!user} countries={countries}
        ship={{ shippingCents: s.shippingCents, freeThresholdCents: s.freeThresholdCents, euShippingCents: s.euShippingCents }}
        delivery={locale === 'en' ? s.deliveryEn : s.deliveryHr} />
    </div>
    </>
  )
}
