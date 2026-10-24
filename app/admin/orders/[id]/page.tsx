import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin, signReviewToken } from '@/lib/auth'
import { codesForOrder } from '@/lib/discount-codes'
import { sql } from '@/lib/db'
import { getInvoicesForOrder } from '@/lib/invoice'
import { money, formatDateTime } from '@/lib/money'
import { Status, orderStage } from '@/components/admin/Status'
import { SupplierOrderPanel } from '@/components/admin/SupplierOrderPanel'
import { ActionForm } from '@/components/Ui'
import { DbError } from '@/components/admin/DbError'
import { MAX_AUTO_ATTEMPTS } from '@/lib/invoice/retry-policy'
import { cancelPending, confirmShipment, issueMissingInvoice, markDelivered, refundOrder, resendShippedEmail, retryIssueInvoiceAction, sendReviewRequestAction, setSupplierOrder } from '../../actions'
import { ConfirmShipForm } from '@/components/admin/ConfirmShipForm'
import { href } from '@/lib/routes'
import { resolveSupplierLine, supplierAddressFields } from '@/lib/supplier-order'
import type { DiscountCode, Invoice, Order, Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

const stepTitle = (n: number, t: string, done?: boolean) => (
  <h2 className="flex items-center gap-3 font-medium">
    <span className={`grid size-6 place-items-center font-mono text-[11px] ${done ? 'bg-emerald-800 text-emerald-100' : 'bg-flame text-ink'}`}>{done ? '✓' : n}</span>{t}
  </h2>
)

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  let o: Order | undefined
  let invoices: Invoice[] = []
  let products: Product[] = []
  let codes: DiscountCode[] = []
  try {
    ;[o] = await sql<Order[]>`select * from orders where id = ${Number(id) || 0}`
    if (o) {
      invoices = await getInvoicesForOrder(o.id)
      codes = [...(await codesForOrder(o.id))]
      const ids = [...new Set(o.items.map((i) => i.productId))]
      if (ids.length) products = [...(await sql<Product[]>`select * from products where id in ${sql(ids)}`)]
    }
  } catch (e) {
    return <DbError error={e} />
  }
  if (!o) notFound()
  const reviewPath = o.status === 'shipped' || o.status === 'delivered'
    ? href(o.locale === 'en' ? 'en' : 'hr', 'review', undefined, `t=${encodeURIComponent(await signReviewToken(o.id))}`)
    : null

  const lines = o.items.map((i) => {
    const p = products.find((x) => x.id === i.productId)
    const supplier = resolveSupplierLine(i, p)
    return { ...supplier, cost: i.costCents ?? p?.costCents ?? null }
  })
  const stage = orderStage(o)
  const paid = ['paid', 'shipped', 'delivered'].includes(o.status)
  const fee = Math.round(o.totalCents * 0.015) + 25
  const costKnown = lines.every((l) => l.cost !== null)
  const cost = lines.reduce((a, l) => a + (l.cost ?? 0) * l.qty, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-mute hover:text-bone">← Narudžbe</Link>
        <h1 className="h-display text-2xl">Narudžba #{o.orderNumber}</h1>
        <Status s={stage} />
        {o.supplierOrder?.trim() ? <span className="font-mono text-sm text-mute">AE {o.supplierOrder.trim()}</span> : null}
        <span className="text-xs text-mute">{formatDateTime(o.createdAt)} · {o.paymentMethod ?? 'nije plaćeno'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {paid && (
            <section className="card space-y-5 p-5">
              {stepTitle(1, 'Naruči na AE', !!o.supplierOrder?.trim())}
              <SupplierOrderPanel
                lines={lines}
                fields={supplierAddressFields(o)}
                orderId={o.id}
                supplierOrder={o.supplierOrder}
                saveAction={setSupplierOrder}
              />
            </section>
          )}

          {(o.status === 'paid' || o.status === 'shipped') && (
            <section className="card space-y-4 p-5">
              {stepTitle(2, o.status === 'paid' ? 'Potvrdi slanje' : 'Poslano', o.status === 'shipped')}
              <ConfirmShipForm
                orderId={o.id}
                status={o.status}
                shippedEmailSentAt={o.shippedEmailSentAt?.toISOString() ?? null}
                shippedEmailError={o.shippedEmailError ?? null}
                confirmAction={confirmShipment}
                resendAction={resendShippedEmail}
              />
              {o.status === 'shipped' && (
                <form action={markDelivered}><input type="hidden" name="id" value={o.id} /><button className="btn-ghost btn-sm">Označi kao dostavljeno</button></form>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-medium">Stavke</h2>
            <ul className="divide-y divide-line text-sm">
              {o.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-4 py-2.5">
                  <span>{i.name}{i.variant && <span className="text-mute"> ({i.variant})</span>} × {i.qty}</span>
                  <span className="font-mono tabular-nums">{money(i.unitCents * i.qty)}</span>
                </li>
              ))}
              {(o.upsellDiscountCents || 0) > 0 && <li className="flex justify-between py-2.5 text-mute"><span>Popust 10%</span><span className="font-mono">{money(-(o.upsellDiscountCents || 0))}</span></li>}
              {(o.promoDiscountCents || 0) > 0 && <li className="flex justify-between py-2.5 text-mute"><span>Popust 5%{o.promoCode ? ` (${o.promoCode})` : ''}</span><span className="font-mono">{money(-(o.promoDiscountCents || 0))}</span></li>}
              {!(o.upsellDiscountCents || o.promoDiscountCents) && o.discountCents > 0 && <li className="flex justify-between py-2.5 text-mute"><span>Popust</span><span className="font-mono">{money(-o.discountCents)}</span></li>}
              <li className="flex justify-between py-2.5 text-mute"><span>Dostava</span><span className="font-mono">{money(o.shippingCents)}</span></li>
              <li className="flex justify-between py-2.5 font-medium"><span>Kupac platio</span><span className="font-mono">{money(o.totalCents)}</span></li>
            </ul>
            {paid && (
              <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-mute"><span>Stripe naknada (procjena 1,5% + 0,25 €)</span><span className="font-mono">−{money(fee)}</span></div>
                <div className="flex justify-between text-mute"><span>Nabava</span><span className="font-mono">{costKnown ? `−${money(cost)}` : 'nepoznato'}</span></div>
                <div className="flex justify-between font-medium"><span>Zarada (procjena)</span><span className="font-mono text-flame-2">{costKnown ? money(o.totalCents - fee - cost) : '—'}</span></div>
                {!costKnown && <p className="text-xs text-mute">Upiši nabavnu cijenu u proizvod da bi se zarada izračunala.</p>}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-medium">Računi</h2>
            {invoices.length === 0 ? (
              <form action={issueMissingInvoice} className="flex items-center gap-3 text-sm text-mute">
                <span>Nema računa.</span>
                {paid && <><input type="hidden" name="id" value={o.id} /><button className="btn-ghost btn-sm">Izdaj račun</button></>}
              </form>
            ) : (
              <ul className="space-y-3 text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3">
                    <a href={`/api/invoice/${inv.id}`} target="_blank" className="link">{inv.stornoOf ? 'Storno ' : ''}{inv.number}</a>
                    <span className="font-mono tabular-nums">{money(inv.totalCents)}</span>
                    <Status s={inv.fiscalStatus} fiscal />
                    {!inv.stornoOf && inv.fiscalStatus !== 'ok' && (
                      <form action={retryIssueInvoiceAction}><input type="hidden" name="id" value={inv.id} /><button className="btn-ghost btn-sm">Ponovno izdaj račun</button></form>
                    )}
                    {inv.soloStornoAt && <span className="text-xs text-mute">Stornirano u Soloa</span>}
                    {!inv.stornoOf && (inv.fiscalStatus === 'error' || inv.fiscalAttempts >= MAX_AUTO_ATTEMPTS) && (
                      <span className="w-full text-xs text-mute">Automatski pokušaji su stali. Gumb šalje ručni pokušaj.</span>
                    )}
                    {inv.fiscalError && <span className="w-full text-xs text-red-300">{inv.fiscalError}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {(o.confirmationEmailError || o.confirmationEmailSentAt) && (
            <section className="card p-5 text-sm">
              <h2 className="mb-3 font-medium">E-mail potvrde narudžbe</h2>
              {o.confirmationEmailError ? (
                <p className="text-red-300">Greška: {o.confirmationEmailError}</p>
              ) : o.confirmationEmailSentAt ? (
                <p className="text-mute">Poslan: {formatDateTime(o.confirmationEmailSentAt)}</p>
              ) : null}
            </section>
          )}

          {(codes.length > 0 || o.promoWarning) && (
            <section className="card space-y-2 p-5 text-sm">
              <h2 className="font-medium">Kodovi za popust</h2>
              {o.promoWarning && <p className="text-xs text-red-300">{o.promoWarning}</p>}
              {codes.map((c) => (
                <p key={c.id} className="text-xs leading-relaxed text-mute">
                  <span className="font-mono text-bone">{c.code}</span>
                  {' · '}{c.percent}%
                  {c.issuedOrderId === o.id ? ' · izdan uz ovu narudžbu' : ''}
                  {c.usedOrderId === o.id ? ' · iskorišten na ovoj narudžbi' : ''}
                  {c.usedAt ? ` · iskorišten ${formatDateTime(c.usedAt)}` : ' · nije iskorišten'}
                  {c.reservedOrderId && c.reservedUntil ? ` · rezerviran do ${formatDateTime(c.reservedUntil)} (#${c.reservedOrderId})` : ''}
                  {' · '}vrijedi do {formatDateTime(c.expiresAt)}
                  {c.email ? ` · ${c.email}` : ''}
                </p>
              ))}
            </section>
          )}

          {reviewPath && (
            <section className="card space-y-3 p-5 text-sm">
              <h2 className="font-medium">Recenzija</h2>
              <p className="text-xs text-mute">E-mail ide automatski 14 dana nakon slanja, samo jednom. Gumb šalje odmah, za test.</p>
              {o.reviewRequestError && <p className="text-red-300">{o.reviewRequestError}</p>}
              {o.reviewRequestSentAt && <p className="text-xs text-mute">Poslan: {formatDateTime(o.reviewRequestSentAt)}</p>}
              <a href={reviewPath} target="_blank" rel="noopener noreferrer" className="link text-xs">Otvori stranicu recenzije ↗</a>
              <ActionForm action={sendReviewRequestAction} submit={o.reviewRequestSentAt ? 'Pošalji zahtjev ponovno' : 'Pošalji zahtjev za recenziju'}>
                <input type="hidden" name="id" value={o.id} />
              </ActionForm>
            </section>
          )}

          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-medium">Kupac</h2>
            <p>{o.name}</p>
            <p className="text-mute">{o.address}, {o.postal} {o.city}, {o.country}</p>
            <p className="mt-2"><a href={`mailto:${o.email}`} className="link">{o.email}</a>{o.phone && <span className="text-mute"> · {o.phone}</span>}</p>
            {o.note && <p className="mt-3 border-t border-line pt-3 text-mute"><b className="text-bone">Napomena kupca:</b> {o.note}</p>}
          </section>
          {paid && (
            <details className="card group/r">
              <summary className="flex items-center justify-between px-5 py-4 font-medium">Povrat novca<span className="font-mono text-mute transition group-open/r:rotate-45">+</span></summary>
              <div className="space-y-3 border-t border-line p-5">
                <p className="text-xs text-mute">Vraća cijeli iznos preko Stripea, izdaje storno račun i šalje e-mail kupcu. Koristi nakon jednostranog raskida (kad roba stigne natrag) ili otkazivanja.</p>
                <ActionForm action={refundOrder} submit="Vrati novac" danger><input type="hidden" name="id" value={o.id} /></ActionForm>
              </div>
            </details>
          )}
          {o.status === 'pending' && (
            <form action={cancelPending}><input type="hidden" name="id" value={o.id} /><button className="btn-ghost w-full">Otkaži nedovršenu narudžbu</button></form>
          )}
        </div>
      </div>
    </div>
  )
}
