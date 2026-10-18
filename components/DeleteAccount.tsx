'use client'

import { useActionState, useState } from 'react'
import { deleteAccount } from '@/app/actions'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'

type State = { error?: string; ok?: string } | null

export function DeleteAccount({ locale }: { locale: Locale }) {
  const d = t(locale)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(deleteAccount, null as State)

  return (
    <div className={`delete-account card p-5${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="delete-account-hit"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {d.deleteAccount}
      </button>
      <div className="delete-account-panel" inert={!open}>
        <div>
          <p className="delete-account-warn">{d.deleteWarn}</p>
          <form action={formAction} className="delete-account-actions">
            <input type="hidden" name="locale" value={locale} />
            {state?.error && <p role="alert" className="w-full text-sm text-red-300">{state.error}</p>}
            <button className="delete-go" type="submit" disabled={pending}>{pending ? '…' : d.deleteConfirm}</button>
            <button className="delete-stop" type="button" onClick={() => setOpen(false)}>{d.deleteCancel}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
