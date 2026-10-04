import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { ActionForm, Field } from '@/components/Ui'
import { forgotPassword } from '@/app/actions'
import type { Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const metadata: Metadata = { robots: { index: false } }

export default async function Forgot({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const d = t(locale)
  return (
    <AuthShell title={d.forgot}>
      <ActionForm action={forgotPassword} submit={d.sendLink} locale={locale}>
        <Field label={d.email} name="email" type="email" required autoComplete="email" />
      </ActionForm>
    </AuthShell>
  )
}
