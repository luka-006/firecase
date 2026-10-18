import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ClearCart } from '@/components/Ui'
import { ProductMarquee } from '@/components/ProductMarquee'
import { CheckIcon } from '@/components/icons'
import { fulfillCheckoutSession, getOrderByPublicId } from '@/lib/orders'
import { getActiveProducts } from '@/lib/products'
import { scheduleKickInvoiceForOrder } from '@/lib/invoice/schedule'
import { stripe } from '@/lib/stripe'
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
  const paid = !['pending', 'cancelled'].includes(order.status)
  if (paid) scheduleKickInvoiceForOrder(order.id)
  const products = paid ? await getActiveProducts() : []

  if (paid) {
    return (
      <div className="container-x max-w-3xl pt-16 pb-8">
        <ClearCart />
        <div className="text-center">
          <span className="pop-in mx-auto mb-6 grid size-14 place-items-center rounded-full border border-flame/50 text-flame"><CheckIcon className="size-6" /></span>
          <h1 className="h-display text-3xl">{d.thanks}</h1>
          <p className="mt-4">{d.orderNo} #{order.orderNumber}</p>
          <p className="mt-2 text-mute">{d.orderPaidText}</p>
          <div className="mt-10"><Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link></div>
        </div>
        <ProductMarquee products={products} locale={locale} />
      </div>
    )
  }

  return (
    <div className="container-x max-w-2xl pt-16 text-center">
      <h1 className="h-display text-3xl">{d.orderNo} #{order.orderNumber}</h1>
      <p className="mt-4 text-mute">{order.status === 'cancelled' ? d.orderCancelledText : d.orderPendingText}</p>
      <div className="mt-10"><Link href={href(locale, 'shop')} className="btn">{d.continueShopping}</Link></div>
    </div>
  )
}
