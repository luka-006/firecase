import 'server-only'
import crypto from 'node:crypto'
import type Stripe from 'stripe'
import { sql } from './db'
import { stripe } from './stripe'
import { markPromoUsed } from './discount-codes'
import { schedulePostPaymentForOrder } from './invoice/schedule'
import { stornoOrderInvoice } from './invoice'
import { sendAdminNewOrder } from './mail'
import { adjustOrderStock } from './stock-db'
import type { Order } from './types'

export const newPublicId = () => crypto.randomBytes(16).toString('base64url')

export async function getOrderByPublicId(publicId: string) {
  const rows = await sql<Order[]>`select * from orders where public_id = ${publicId}`
  return rows[0] ?? null
}

export async function getOrderByPaymentIntent(paymentIntentId: string) {
  const rows = await sql<Order[]>`select * from orders where stripe_payment_intent = ${paymentIntentId} limit 1`
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

  let order: Order | null = null
  const [freshPaid] = await sql<Order[]>`
    update orders set status = 'paid', paid_at = now(), stripe_payment_intent = ${pi?.id ?? null},
      payment_method = ${paymentLabel(pi)}
    where id = ${orderId} and status = 'pending' returning *`

  if (freshPaid) {
    order = freshPaid
    const adminResult = await sendAdminNewOrder(order)
    if (!adminResult.ok) console.error('[mail] admin nova narudžba', order.id, adminResult.error)
  } else {
    const [existing] = await sql<Order[]>`select * from orders where id = ${orderId} and status <> 'pending'`
    if (!existing) return null
    order = existing
  }

  await adjustOrderStock(order.id, 'take')

  if (order.discountCodeId) {
    const marked = await markPromoUsed(order.discountCodeId, order.id)
    if (!marked) {
      const warning = 'Kod je već iskorišten na drugoj narudžbi. Plaćena narudžba je ipak provedena.'
      console.error('[promo]', warning, order.id, order.discountCodeId)
      await sql`update orders set promo_warning = ${warning} where id = ${order.id}`
    }
  }
  schedulePostPaymentForOrder(order)
  return order
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!piId) return null
  const order = await getOrderByPaymentIntent(piId)
  if (!order || order.status === 'refunded') return order

  const [updated] = await sql<Order[]>`update orders set status = 'refunded' where id = ${order.id} and status in ('paid', 'shipped', 'delivered') returning *`
  if (!updated) return null
  await adjustOrderStock(updated.id, 'give')

  const storno = await stornoOrderInvoice(updated)
  if (!storno.ok) console.error('[solo] storno nakon refunda', order.id, storno.error)

  const { sendRefunded } = await import('./mail')
  const mail = await sendRefunded(updated)
  if (!mail.ok) console.error('[mail] povrat novca', order.id, mail.error)
  return updated
}
