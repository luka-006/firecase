import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/PrintButton'
import { LEGAL, LEGAL_DOCS, type LegalDoc } from '@/lib/legal'
import { getSettings } from '@/lib/settings'
import { href, LOCALES, type Locale, type RouteKey } from '@/lib/routes'

export const revalidate = 300
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LEGAL_DOCS.map((doc) => ({ locale, doc })))
}

type Props = { params: Promise<{ locale: string; doc: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doc } = await params
  const d = LEGAL[locale as Locale]?.[doc as LegalDoc]
  if (!d) return {}
  const key = doc as RouteKey
  return { title: d.title, alternates: { canonical: href(locale as Locale, key), languages: { hr: href('hr', key), en: href('en', key) } } }
}

export default async function LegalPage({ params }: Props) {
  const { locale: l, doc } = await params
  const locale = l as Locale
  const d = LEGAL[locale]?.[doc as LegalDoc]
  if (!d) notFound()
  const s = await getSettings()
  return (
    <div className="container-x pt-14">
      <h1 className="h-display text-3xl sm:text-4xl">{d.title}</h1>
      <div className="prose-legal mt-8">{d.body({ s, locale })}</div>
      {doc === 'withdrawal' && <PrintButton label={locale === 'en' ? 'Print / save as PDF' : 'Ispiši / spremi kao PDF'} />}
    </div>
  )
}
