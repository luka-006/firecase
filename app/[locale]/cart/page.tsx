import type { Metadata } from 'next'
import { CartView } from '@/components/CartView'
import type { Locale } from '@/lib/routes'

export const metadata: Metadata = { title: 'Košarica · Cart', robots: { index: false } }

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  return <CartView locale={locale} />
}
