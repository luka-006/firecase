import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { ActionForm, Field } from '@/components/Ui'
import { register } from '@/app/actions'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const metadata: Metadata = { title: 'Registracija · Sign up', robots: { index: false } }

export default async function Register({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const d = t(locale)
  return (
    <AuthShell title={d.createAccount}>
      <ActionForm action={register} submit={d.createAccount} locale={locale}>
        <Field label={d.name} name="name" autoComplete="name" />
        <Field label={d.email} name="email" type="email" required autoComplete="email" />
        <Field label={d.password} name="password" type="password" required minLength={8} autoComplete="new-password" hint={d.passwordHint} />
        <p className="text-xs text-mute">
          {locale === 'en' ? 'By creating an account you confirm you have read the ' : 'Izradom računa potvrđujete da ste pročitali '}
          <Link href={href(locale, 'privacy')} className="link">{d.privacy}</Link>.
        </p>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-mute">{d.haveAccount} <Link href={href(locale, 'login')} className="link text-bone">{d.login}</Link></p>
    </AuthShell>
  )
}
