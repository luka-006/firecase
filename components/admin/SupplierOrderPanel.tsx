'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supplierHref } from '@/lib/supplier-link'
import { SUPPLIER_NOTE, supplierAddressBlock, type AddressField, type SupplierLine } from '@/lib/supplier-order'

function CopyButton({ value, label = 'Kopiraj', prominent = false }: { value: string; label?: string; prominent?: boolean }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      disabled={!value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setOk(true)
          setTimeout(() => setOk(false), 1200)
        } catch {
          setOk(false)
        }
      }}
      className={prominent
        ? 'btn-ghost btn-sm shrink-0 disabled:opacity-40'
        : 'shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-mute transition hover:text-flame disabled:opacity-40'}
    >
      {ok ? 'Kopirano' : label}
    </button>
  )
}

function warn(line: SupplierLine) {
  if (line.missingUrl && line.missingOption) return 'Nema linka ni opcije.'
  if (line.missingUrl) return 'Nema linka artikla.'
  if (line.missingOption) return 'Nema opcije za ovu veličinu.'
  return ''
}

export function SupplierOrderPanel({
  lines,
  fields,
  orderId,
  supplierOrder,
  saveAction,
}: {
  lines: SupplierLine[]
  fields: AddressField[]
  orderId: number
  supplierOrder: string
  saveAction: (formData: FormData) => void | Promise<void>
}) {
  const block = supplierAddressBlock(fields)
  const saved = supplierOrder.trim()
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line, idx) => {
          const href = supplierHref(line.url)
          const problem = warn(line)
          return (
            <li key={idx} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p><span className="font-mono text-flame">{line.qty} ×</span> {line.name}</p>
                {line.variant ? <p className="text-mute">{line.variant}</p> : null}
                {line.option ? <p>Opcija: {line.option}</p> : null}
                {line.sku ? <p className="text-mute">SKU: {line.sku}</p> : null}
                {line.note ? <p className="text-mute">{line.note}</p> : null}
                {problem ? (
                  <p className="mt-1 text-amber-300">
                    {problem}{' '}
                    {line.productId ? <Link href={`/admin/products/${line.productId}`} className="underline">Uredi proizvod</Link> : null}
                  </p>
                ) : null}
              </div>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Naruči na AE</a>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <p className="label mb-0">Adresa</p>
          <CopyButton value={block} label="Kopiraj sve" prominent />
        </div>
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{field.label}</span>
              <span className="block break-words text-sm">{field.value || '—'}</span>
            </span>
            <CopyButton value={field.value} />
          </div>
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 border border-line p-3">
        <p className="min-w-0 text-sm">
          <span className="label">Napomena dobavljaču</span>
          {SUPPLIER_NOTE}
        </p>
        <CopyButton value={SUPPLIER_NOTE} />
      </div>

      <form action={saveAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={orderId} />
        <label className="block min-w-[16rem] flex-1">
          <span className="label">Broj narudžbe na AE</span>
          <input name="supplierOrder" defaultValue={saved} maxLength={80} className="input" />
        </label>
        <button className="btn btn-sm">Spremi</button>
      </form>
      {saved ? <p className="font-mono text-sm">AE {saved}</p> : null}
    </div>
  )
}
