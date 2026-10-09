import 'server-only'
import crypto from 'node:crypto'
import type Stripe from 'stripe'
import { revalidateTag } from 'next/cache'
import { sql } from './db'
import { stripe } from './stripe'
import { issueInvoice } from './invoice'
import { renderInvoicePdf } from './invoice/pdf'
import { sendAdminNewOrder, sendOrderConfirmation } from './mail'
import { logConfirmationEmail } from './mail/order-email-log'
import { getSettingsFresh } from './settings'
import type { Order } from './types'

export const newPublicId = () => crypto.randomBytes(16).toString('base64url')

export async function getOrderByPublicId(publicId: string) {
  const rows = await sql<Order[]>`select * from orders where public_id = ${publicId}`
  return rows[0] ?? null
}

function paymentLabel(pi: Stripe.PaymentIntent | null) {
  const charge = pi?.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null
  const d = charge?.payment_method_details
  if (!d) return 'Kartica'
  if (d.type === 'card') {
    const w = d.card?.wallet?.type
    if (w === 'apple_pay') return 'Apple Pay (kartica)'
    if (w === 'google_pay') return 'Google Pay (kartica)'
    return `Kartica${d.card?.brand ? ' ' + d.card.brand.toUpperCase() : ''}`
  }
  if (d.type === 'paypal') return 'PayPal'
  if (d.type === 'link') return 'Kartica (Link)'
  return d.type
}

// Idempotentno: poziva se iz webhooka i sa stranice zahvale; samo prvi poziv obrađuje narudžbu.
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return null
  const orderId = Number(session.metadata?.orderId)
  if (!orderId) return null
  const s = stripe()
  let pi: Stripe.PaymentIntent | null = null
  if (s && session.payment_intent) {
    const id = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
    pi = await s.paymentIntents.retrieve(id, { expand: ['latest_charge'] })
  }
  const [order] = await sql<Order[]>`
    update orders set status = 'paid', paid_at = now(), stripe_payment_intent = ${pi?.id ?? null},
      payment_method = ${paymentLabel(pi)}
    where id = ${orderId} and status = 'pending' returning *`
  if (!order) return null

  // Zaliha (ako se prati)
  for (const i of order.items) {
    await sql`update products set stock = greatest(stock - ${i.qty}, 0) where id = ${i.productId} and stock is not null`
  }
  revalidateTag('products', 'max')

  let pdf: { number: string; pdf: Uint8Array } | undefined
  try {
    const inv = await issueInvoice(order)
    pdf = { number: inv.number, pdf: await renderInvoicePdf(inv) }
  } catch (e) {
    console.error('[invoice] izdavanje nije uspjelo za narudžbu', order.id, (e as Error).message)
  }
  const settings = await getSettingsFresh()
  const delivery = order.locale === 'en' ? settings.deliveryEn : settings.deliveryHr
  const confirmResult = await sendOrderConfirmation(order, pdf, delivery || undefined)
  await logConfirmationEmail(order.id, confirmResult.ok ? { ok: true } : { ok: false, error: confirmResult.error })
  const adminResult = await sendAdminNewOrder(order)
  if (!adminResult.ok) console.error('[mail] admin nova narudžba', order.id, adminResult.error)
  return order
}
