import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { fulfillCheckoutSession, handleChargeRefunded } from '@/lib/orders'
import { releasePromoReservation } from '@/lib/discount-codes'
import { adjustOrderStock } from '@/lib/stock-db'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const s = stripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!s || !secret) return new Response('Stripe not configured', { status: 500 })
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = s.webhooks.constructEvent(body, req.headers.get('stripe-signature') ?? '', secret)
  } catch (e) {
    return new Response(`Invalid signature: ${(e as Error).message}`, { status: 400 })
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillCheckoutSession(event.data.object)
        break
      case 'checkout.session.expired': {
        const orderId = Number(event.data.object.metadata?.orderId) || 0
        await releasePromoReservation(orderId)
        const [cancelled] = await sql<{ id: number }[]>`update orders set status = 'cancelled' where id = ${orderId} and status = 'pending' returning id`
        if (cancelled) await adjustOrderStock(orderId, 'give')
        break
      }
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object)
        break
    }
  } catch (e) {
    console.error('[webhook]', event.type, (e as Error).message)
    return new Response('Handler error', { status: 500 })
  }
  return Response.json({ received: true })
}
