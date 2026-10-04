import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { ActionForm, Field } from '@/components/Ui'
import { login } from '@/app/actions'
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
      <ActionForm action={login} submit={d.login} locale={locale}>
        <Field label={d.email} name="email" type="email" required autoComplete="email" />
        <Field label={d.password} name="password" type="password" required autoComplete="current-password" />
      </ActionForm>
      <div className="mt-6 space-y-2 text-center text-sm text-mute">
        <p><Link href={href(locale, 'forgot')} className="link">{d.forgot}</Link></p>
        <p>{d.noAccount} <Link href={href(locale, 'register')} className="link text-bone">{d.createAccount}</Link></p>
      </div>
    </AuthShell>
  )
}
