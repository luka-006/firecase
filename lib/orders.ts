import 'server-only'
import crypto from 'node:crypto'
import type Stripe from 'stripe'
import { revalidateTag } from 'next/cache'
import { sql } from './db'
import { stripe } from './stripe'
import { getInvoicePdfBytes, stornoOrderInvoice, waitForOrderInvoice } from './invoice'
import { sendAdminNewOrder, sendOrderConfirmation } from './mail'
import { logConfirmationEmail } from './mail/order-email-log'
import { getSettingsFresh } from './settings'
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
  const [order] = await sql<Order[]>`
    update orders set status = 'paid', paid_at = now(), stripe_payment_intent = ${pi?.id ?? null},
      payment_method = ${paymentLabel(pi)}
    where id = ${orderId} and status = 'pending' returning *`
  if (!order) return null

  for (const i of order.items) {
    await sql`update products set stock = greatest(stock - ${i.qty}, 0) where id = ${i.productId} and stock is not null`
  }
  revalidateTag('products', 'max')

  const adminResult = await sendAdminNewOrder(order)
  if (!adminResult.ok) console.error('[mail] admin nova narudžba', order.id, adminResult.error)

  const settings = await getSettingsFresh()
  const delivery = order.locale === 'en' ? settings.deliveryEn : settings.deliveryHr

  let pdf: { number: string; pdf: Uint8Array } | undefined
  let invoicePending = false
  try {
    const inv = await waitForOrderInvoice(order, 45_000)
    if (inv?.soloPdfUrl && inv.fiscalStatus === 'ok') {
      pdf = { number: inv.number, pdf: await getInvoicePdfBytes(inv) }
    } else if (inv && inv.fiscalStatus !== 'ok') {
      invoicePending = true
    } else if (!inv) {
      invoicePending = true
    }
  } catch (e) {
    console.error('[invoice] izdavanje nije uspjelo za narudžbu', order.id, (e as Error).message)
    invoicePending = true
  }

  const confirmResult = await sendOrderConfirmation(order, pdf, delivery || undefined, { invoicePending })
  await logConfirmationEmail(order.id, confirmResult.ok ? { ok: true } : { ok: false, error: confirmResult.error })
  return order
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!piId) return null
  const order = await getOrderByPaymentIntent(piId)
  if (!order || order.status === 'refunded') return order

  const [updated] = await sql<Order[]>`update orders set status = 'refunded' where id = ${order.id} and status in ('paid', 'shipped', 'delivered') returning *`
  if (!updated) return null

  const storno = await stornoOrderInvoice(updated)
  if (!storno.ok) console.error('[solo] storno nakon refunda', order.id, storno.error)

  const { sendRefunded } = await import('./mail')
  const mail = await sendRefunded(updated, undefined, { soloStornoManual: storno.manual && !storno.ok })
  if (!mail.ok) console.error('[mail] povrat novca', order.id, mail.error)
  return updated
}
