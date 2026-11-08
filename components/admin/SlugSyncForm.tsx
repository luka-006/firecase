'use client'

import { useActionState } from 'react'
import { syncCatalogueSlugs } from '@/app/admin/actions'

export function SlugSyncForm() {
  const [state, action, pending] = useActionState(syncCatalogueSlugs, null)
  return (
    <form action={action} className="card space-y-3 p-4">
      <p className="text-sm text-mute">URL svakog proizvoda prati hrvatski naziv koji stoji na stranici. Engleski naziv se ne koristi. Stari URL ostaje i vodi na novi. Nazivi, cijene i slike se ne mijenjaju.</p>
      <button className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto" disabled={pending}>
        {pending ? 'Usklađujem…' : 'Uskladi URL-ove s hrvatskim nazivom'}
      </button>
      {state && !state.ok ? <p className="text-sm text-red-300">{state.error}</p> : null}
      {state?.ok && state.changes.length === 0 ? <p className="text-sm text-emerald-300">Svi URL-ovi već prate hrvatski naziv.</p> : null}
      {state?.ok && state.changes.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {state.changes.map((row) => (
            <li key={row.id}>
              <span className="text-bone">{row.nameHr}</span>{' '}
              <span className="text-mute">{row.from} → {row.to}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
