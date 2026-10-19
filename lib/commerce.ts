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

/** Percent off the product subtotal. Shipping is never included. */
export function promoCentsFor(subtotalCents: number, percent: number) {
  if (percent <= 0 || subtotalCents <= 0) return 0
  return Math.min(subtotalCents, Math.round(subtotalCents * percent / 100))
}

/** Stripe allows one coupon. Both discounts share it; the name stays within 40 characters. */
export function stripeCouponName(labels: string[], fallback: string) {
  return labels.filter(Boolean).join(' + ').slice(0, 40) || fallback
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
  promoPercent = 0,
) {
  const upsellDiscountCents = discountCentsFor(subtotalCents, qty, upsell)
  let promoDiscountCents = promoCentsFor(subtotalCents, promoPercent)
  if (upsellDiscountCents + promoDiscountCents > subtotalCents) {
    promoDiscountCents = Math.max(0, subtotalCents - upsellDiscountCents)
  }
  const discountCents = upsellDiscountCents + promoDiscountCents
  const net = Math.max(0, subtotalCents - discountCents)
  const shippingCents = country === 'HR'
    ? hrShippingCents(subtotalCents, settings.shippingCents, settings.freeThresholdCents)
    : settings.euShippingCents
  return { upsellDiscountCents, promoDiscountCents, discountCents, shippingCents, totalCents: net + shippingCents }
}
