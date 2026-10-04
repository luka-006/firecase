import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ClearCart } from '@/components/Ui'
import { CheckIcon } from '@/components/icons'
import { fulfillCheckoutSession, getOrderByPublicId } from '@/lib/orders'
import { getInvoicesForOrder } from '@/lib/invoice'
import { stripe } from '@/lib/stripe'
import { money, formatDateTime } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export const metadata: Metadata = { title: 'Narudžba · Order', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ session_id?: string }> }

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale: l, id } = await params
  const locale = l as Locale
  const { session_id } = await searchParams
  const d = t(locale)
  let order = await getOrderByPublicId(id)
  if (!order) notFound()

  // Ako webhook još nije stigao, provjeri sesiju izravno (idempotentno)
  if (order.status === 'pending' && session_id && session_id === order.stripeSessionId) {
    const s = stripe()
    if (s) {
      try {
        const session = await s.checkout.sessions.retrieve(session_id)
        await fulfillCheckoutSession(session)
        order = (await getOrderByPublicId(id))!
      } catch (e) {
        console.error('[order]', (e as Error).message)
      }
    }
  }
  const invoices = order.status !== 'pending' ? await getInvoicesForOrder(order.id) : []
  const paid = !['pending', 'cancelled'].includes(order.status)

  return (
    <div className="container-x max-w-2xl pt-16">
      {paid && <ClearCart />}
      <div className="text-center">
        {paid && <span className="mx-auto mb-6 grid size-14 place-items-center rounded-full border border-flame/50 text-flame"><CheckIcon className="size-6" /></span>}
        <h1 className="h-display text-3xl">{paid ? d.thanks : `${d.orderNo} #${order.id}`}</h1>
        <p className="mt-4 text-mute">{order.status === 'pending' ? d.orderPendingText : order.status === 'cancelled' ? d.orderCancelledText : d.orderPaidText}</p>
      </div>
      <div className="card mt-10 p-6">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>{d.orderNo} <b>#{order.id}</b></span>
          <span className="text-mute">{formatDateTime(order.createdAt, locale)} · {d.status[order.status]}</span>
        </div>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4 py-3 text-sm">
              <span>{i.name}{i.variant && <span className="text-mute"> ({i.variant})</span>} × {i.qty}</span>
              <span className="tabular-nums">{money(i.unitCents * i.qty, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-mute"><span>{d.shipping}</span><span className="tabular-nums">{order.shippingCents ? money(order.shippingCents, locale) : d.free}</span></div>
          <div className="flex justify-between font-medium"><span>{d.total}</span><span className="tabular-nums">{money(order.totalCents, locale)}</span></div>
        </div>
        {invoices.map((inv) => (
          <a key={inv.id} href={`/api/invoice/${inv.id}?t=${order.publicId}`} className="btn-ghost btn-sm mt-5 mr-2">{d.downloadInvoice} · {inv.number}</a>
        ))}
      </div>
      <div className="mt-10 text-center"><Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link></div>
    </div>
  )
}
