import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getInvoicesForOrder } from '@/lib/invoice'
import { money, formatDateTime } from '@/lib/money'
import { Status } from '@/components/admin/Status'
import { ActionForm } from '@/components/Ui'
import { cancelPending, issueMissingInvoice, markDelivered, markShipped, refundOrder, retryFiscal } from '../../actions'
import type { Invoice, Order } from '@/lib/types'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  let o: Order | undefined
  let invoices: Invoice[] = []
  try {
    ;[o] = await sql<Order[]>`select * from orders where id = ${Number(id) || 0}`
    if (o) invoices = await getInvoicesForOrder(o.id)
  } catch (e) {
    return <DbError error={e} />
  }
  if (!o) notFound()
  const addr = `${o.name}\n${o.address}\n${o.postal} ${o.city}\n${o.country}\n${o.phone}`

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-mute hover:text-bone">← Narudžbe</Link>
        <h1 className="h-display text-2xl">Narudžba #{o.id}</h1>
        <Status s={o.status} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-medium">Stavke</h2>
            <ul className="divide-y divide-line text-sm">
              {o.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-4 py-2.5">
                  <span>{i.name}{i.variant && <span className="text-mute"> ({i.variant})</span>} × {i.qty} <Link href={`/admin/products/${i.productId}`} className="ml-2 text-xs text-mute hover:text-bone">proizvod →</Link></span>
                  <span className="tabular-nums">{money(i.unitCents * i.qty)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 text-mute"><span>Dostava</span><span>{money(o.shippingCents)}</span></li>
              <li className="flex justify-between py-2.5 font-medium"><span>Ukupno</span><span>{money(o.totalCents)}</span></li>
            </ul>
            <p className="mt-3 text-xs text-mute">Kreirano {formatDateTime(o.createdAt)}{o.paidAt && ` · plaćeno ${formatDateTime(o.paidAt)}`} · {o.paymentMethod ?? '-'}</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-medium">Računi</h2>
            {invoices.length === 0 ? (
              <form action={issueMissingInvoice} className="flex items-center gap-3 text-sm text-mute">
                <span>Nema računa.</span>
                {o.status !== 'pending' && o.status !== 'cancelled' && <><input type="hidden" name="id" value={o.id} /><button className="btn-ghost btn-sm">Izdaj račun</button></>}
              </form>
            ) : (
              <ul className="space-y-3 text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3">
                    <a href={`/api/invoice/${inv.id}`} target="_blank" className="link">{inv.stornoOf ? 'Storno ' : ''}{inv.number}</a>
                    <span className="tabular-nums">{money(inv.totalCents)}</span>
                    <Status s={inv.fiscalStatus} fiscal />
                    {inv.fiscalStatus === 'pending' && (
                      <form action={retryFiscal}><input type="hidden" name="id" value={inv.id} /><button className="btn-ghost btn-sm">Ponovi fiskalizaciju</button></form>
                    )}
                    {inv.fiscalError && <span className="w-full text-xs text-red-300">{inv.fiscalError}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {o.note && <section className="card p-5 text-sm"><h2 className="mb-2 font-medium">Napomena kupca</h2><p className="whitespace-pre-line text-mute">{o.note}</p></section>}
        </div>

        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-medium">Kupac / adresa dostave</h2>
            <pre className="whitespace-pre-wrap font-sans text-bone/85">{addr}</pre>
            <p className="mt-2"><a href={`mailto:${o.email}`} className="link">{o.email}</a></p>
            <p className="mt-3 text-xs text-mute">Kopiraj adresu iznad za narudžbu kod dobavljača.</p>
          </section>
          {(o.status === 'paid' || o.status === 'shipped') && (
            <section className="card p-5">
              <h2 className="mb-3 font-medium">{o.status === 'paid' ? 'Označi kao poslano' : 'Ažuriraj praćenje'}</h2>
              <form action={markShipped} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <input name="tracking" defaultValue={o.tracking} placeholder="Broj za praćenje (neobavezno)" className="input" />
                <button className="btn w-full">Spremi i obavijesti kupca</button>
              </form>
              {o.status === 'shipped' && (
                <form action={markDelivered} className="mt-3"><input type="hidden" name="id" value={o.id} /><button className="btn-ghost w-full">Označi kao dostavljeno</button></form>
              )}
            </section>
          )}
          {['paid', 'shipped', 'delivered'].includes(o.status) && (
            <section className="card p-5">
              <h2 className="mb-1 font-medium">Povrat novca</h2>
              <p className="mb-3 text-xs text-mute">Vraća cijeli iznos preko Stripea, izdaje storno račun i šalje e-mail kupcu. Koristi nakon jednostranog raskida (kad stigne roba) ili otkazivanja.</p>
              <ActionForm action={refundOrder} submit="Vrati novac" danger><input type="hidden" name="id" value={o.id} /></ActionForm>
            </section>
          )}
          {o.status === 'pending' && (
            <form action={cancelPending}><input type="hidden" name="id" value={o.id} /><button className="btn-ghost w-full">Otkaži nedovršenu narudžbu</button></form>
          )}
        </div>
      </div>
    </div>
  )
}
