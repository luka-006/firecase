/** 10% of the product subtotal, in cents. Shipping is never included. */
export function discountCentsFor(subtotalCents: number, qty: number, upsell: boolean) {
  if (!upsell || qty < 2 || subtotalCents <= 0) return 0
  return Math.min(subtotalCents, Math.round(subtotalCents * 0.1))
}
