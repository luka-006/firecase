/** Free delivery in Croatia, and the cutoff for the extra-case discount. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 4000

/** 10% applies only while the product subtotal is strictly under 40 €. */
export const UPSELL_SUBTOTAL_LIMIT_CENTS = FREE_SHIPPING_THRESHOLD_CENTS

export const CART_STORAGE_KEY = 'fc_cart'
export const UPSELL_SEEN_KEY = 'fc_upsell_shown'

/** 10% of the product subtotal, in cents. Shipping is never included. */
export function discountCentsFor(subtotalCents: number, qty: number, upsell: boolean) {
  if (!upsell || qty < 2 || subtotalCents <= 0) return 0
  if (subtotalCents >= UPSELL_SUBTOTAL_LIMIT_CENTS) return 0
  return Math.min(subtotalCents, Math.round(subtotalCents * 0.1))
}

export function hrShippingCents(
  subtotalCents: number,
  shippingCents: number,
  freeThresholdCents = FREE_SHIPPING_THRESHOLD_CENTS,
) {
  return subtotalCents >= freeThresholdCents ? 0 : shippingCents
}

export function priceOrder(
  subtotalCents: number,
  qty: number,
  upsell: boolean,
  country: string,
  settings: { shippingCents: number; freeThresholdCents: number; euShippingCents: number },
) {
  const discountCents = discountCentsFor(subtotalCents, qty, upsell)
  const shippingCents = country === 'HR'
    ? hrShippingCents(subtotalCents, settings.shippingCents, settings.freeThresholdCents)
    : settings.euShippingCents
  return { discountCents, shippingCents, totalCents: subtotalCents - discountCents + shippingCents }
}
