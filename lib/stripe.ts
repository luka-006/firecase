import 'server-only'
import Stripe from 'stripe'

let client: Stripe | null = null
export function stripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY))
}
