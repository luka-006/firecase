import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/orders'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 30

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
      case 'checkout.session.expired':
        await sql`update orders set status = 'cancelled' where id = ${Number(event.data.object.metadata?.orderId) || 0} and status = 'pending'`
        break
    }
  } catch (e) {
    console.error('[webhook]', event.type, (e as Error).message)
    return new Response('Handler error', { status: 500 })
  }
  return Response.json({ received: true })
}
