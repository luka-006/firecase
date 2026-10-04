import { redirect } from 'next/navigation'
import Image from 'next/image'
import { ActionForm, Field } from '@/components/Ui'
import { isAdmin } from '@/lib/auth'
import { adminLogin } from '../actions'

export default async function AdminLogin() {
  if (await isAdmin()) redirect('/admin')
  return (
    <div className="mx-auto mt-20 max-w-xs">
      <Image src="/logo-mark.svg" alt="Firecase" width={40} height={78} className="mx-auto mb-10 h-16 w-auto" />
      <ActionForm action={adminLogin} submit="Prijava">
        <Field label="Admin lozinka" name="password" type="password" required autoComplete="current-password" />
      </ActionForm>
    </div>
  )
}
