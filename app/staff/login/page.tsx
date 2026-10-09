import { redirect } from 'next/navigation'
import { ActionForm, Field } from '@/components/Ui'
import { isStaff } from '@/lib/auth'
import { staffLogin } from '../actions'

export const dynamic = 'force-dynamic'

export default async function StaffLoginPage() {
  if (await isStaff()) redirect('/staff/proposals')
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="h-display text-2xl">Staff prijava</h1>
      <p className="text-sm text-mute">Sourcing proizvoda — nema pristupa narudžbama ni admin postavkama.</p>
      <ActionForm action={staffLogin} submit="Prijava">
        <Field label="Lozinka" name="password" type="password" required autoComplete="current-password" />
      </ActionForm>
    </div>
  )
}
