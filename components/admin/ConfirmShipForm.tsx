'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { SHIPPING_CARRIERS } from '@/lib/mail/carriers'

type Props = {
  orderId: number
  status: string
  tracking: string
  carrier: string
  trackingUrl: string
  shippedEmailSentAt: string | null
  shippedEmailError: string | null
  confirmAction: (formData: FormData) => void | Promise<void>
  resendAction: (formData: FormData) => void | Promise<void>
  updateOnlyAction?: (formData: FormData) => void | Promise<void>
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
  tracking,
  carrier,
  trackingUrl,
  shippedEmailSentAt,
  shippedEmailError,
  confirmAction,
  resendAction,
  updateOnlyAction,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resendOpen, setResendOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isPaid = status === 'paid'
  const isShipped = status === 'shipped'

  const fields = (
    <>
      <input type="hidden" name="id" value={orderId} />
      <label className="block flex-1 min-w-[200px]">
        <span className="label">Dostavna služba</span>
        <select name="carrierPreset" defaultValue={SHIPPING_CARRIERS.includes(carrier as (typeof SHIPPING_CARRIERS)[number]) ? carrier : ''} className="input">
          <option value="">— odaberi —</option>
          {SHIPPING_CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block flex-1 min-w-[200px]">
        <span className="label">Ili upiši ručno</span>
        <input name="carrierCustom" defaultValue={!SHIPPING_CARRIERS.includes(carrier as (typeof SHIPPING_CARRIERS)[number]) ? carrier : ''} placeholder="npr. lokalni kurir" className="input" />
      </label>
      <label className="block flex-1 min-w-[200px]">
        <span className="label">Broj za praćenje *</span>
        <input name="tracking" defaultValue={tracking} required={isPaid} placeholder="s AliExpressa" className="input" />
      </label>
      <label className="block flex-1 min-w-[240px]">
        <span className="label">Poveznica za praćenje (neobavezno)</span>
        <input name="trackingUrl" type="url" defaultValue={trackingUrl} placeholder="https://…" className="input" />
      </label>
    </>
  )

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
        <>
          <form
            ref={formRef}
            action={confirmAction}
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              if (!confirmOpen) {
                e.preventDefault()
                setConfirmOpen(true)
              }
            }}
          >
            {fields}
            <input type="hidden" name="confirm" value={confirmOpen ? 'yes' : ''} />
            <Submit label="Potvrdi slanje" />
          </form>
          {confirmOpen && (
            <div className="rounded border border-flame/40 bg-flame/10 p-4 text-sm">
              <p className="font-medium text-bone">Poslati narudžbu i obavijestiti kupca e-mailom?</p>
              <p className="mt-1 text-mute">Status postaje „Poslano”. Ova akcija šalje e-mail samo jednom; ponovno slanje je zasebna akcija.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => formRef.current?.requestSubmit()}>
                  Da, potvrdi slanje
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmOpen(false)}>
                  Odustani
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isShipped && updateOnlyAction && (
        <form action={updateOnlyAction} className="flex flex-wrap items-end gap-3">
          {fields}
          <Submit label="Spremi podatke o dostavi" className="btn-ghost btn-sm" />
        </form>
      )}

      {isShipped && (
        <form
          action={resendAction}
          onSubmit={(e) => {
            if (!resendOpen) {
              e.preventDefault()
              setResendOpen(true)
            }
          }}
        >
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="confirmResend" value={resendOpen ? 'yes' : ''} />
          {!resendOpen ? (
            <button type="submit" className="btn-ghost btn-sm">
              {shippedEmailSentAt ? 'Pošalji e-mail o slanju ponovno' : 'Pošalji e-mail o slanju'}
            </button>
          ) : (
            <div className="rounded border border-amber-900/50 bg-amber-950/30 p-4 text-sm">
              <p className="font-medium">
                {shippedEmailSentAt ? 'Ponovno poslati e-mail „Vaša narudžba je poslana”?' : 'Poslati e-mail „Vaša narudžba je poslana” kupcu?'}
              </p>
              <div className="mt-3 flex gap-2">
                <Submit label={shippedEmailSentAt ? 'Pošalji ponovno' : 'Pošalji e-mail'} className="btn btn-sm" />
                <button type="button" className="btn-ghost btn-sm" onClick={() => setResendOpen(false)}>
                  Odustani
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
