'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  orderId: number
  status: string
  shippedEmailSentAt: string | null
  shippedEmailError: string | null
  confirmAction: (formData: FormData) => void | Promise<void>
  resendAction: (formData: FormData) => void | Promise<void>
}

function Submit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className ?? 'btn btn-sm'} disabled={pending}>
      {pending ? '…' : label}
    </button>
  )
}

export function ConfirmShipForm({
  orderId,
  status,
  shippedEmailSentAt,
  shippedEmailError,
  confirmAction,
  resendAction,
}: Props) {
  const isPaid = status === 'paid'
  const isShipped = status === 'shipped'

  return (
    <div className="space-y-4">
      {shippedEmailError && (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          E-mail kupcu nije poslan: {shippedEmailError}
        </p>
      )}
      {shippedEmailSentAt && (
        <p className="text-xs text-mute">E-mail o slanju poslan: {new Date(shippedEmailSentAt).toLocaleString('hr-HR')}</p>
      )}

      {isPaid && (
        <form action={confirmAction}>
          <input type="hidden" name="id" value={orderId} />
          <Submit label="Potvrdi slanje" />
        </form>
      )}

      {isShipped && (
        <form action={resendAction}>
          <input type="hidden" name="id" value={orderId} />
          <Submit label={shippedEmailSentAt ? 'Pošalji e-mail o slanju ponovno' : 'Pošalji e-mail o slanju'} className="btn-ghost btn-sm" />
        </form>
      )}
    </div>
  )
}
