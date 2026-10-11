import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { EmailCodeAuth } from '@/components/EmailCodeAuth'
import { getUser } from '@/lib/auth'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const metadata: Metadata = { title: 'Prijava · Log in', robots: { index: false } }

export default async function Login({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  if (await getUser()) redirect(href(locale, 'account'))
  const d = t(locale)
  return (
    <AuthShell title={d.login}>
      <EmailCodeAuth locale={locale} mode="login" />
      <div className="mt-6 space-y-2 text-center text-sm text-mute">
        <p><Link href={href(locale, 'forgot')} className="link">{d.forgot}</Link></p>
        <p>{d.noAccount} <Link href={href(locale, 'register')} className="link text-bone">{d.createAccount}</Link></p>
      </div>
    </AuthShell>
  )
}
