import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { ActionForm, Field } from '@/components/Ui'
import { resetPassword } from '@/app/actions'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const metadata: Metadata = { robots: { index: false } }

export default async function Reset({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const locale = (await params).locale as Locale
  const { token = '' } = await searchParams
  const d = t(locale)
  return (
    <AuthShell title={d.newPassword}>
      <ActionForm action={resetPassword} submit={d.save} locale={locale}>
        <input type="hidden" name="token" value={token} />
        <Field label={d.newPassword} name="password" type="password" required minLength={8} autoComplete="new-password" hint={d.passwordHint} />
      </ActionForm>
      <p className="mt-6 text-center text-sm"><Link href={href(locale, 'login')} className="link">{d.login}</Link></p>
    </AuthShell>
  )
}
