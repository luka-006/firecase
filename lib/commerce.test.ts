import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  discountCentsFor,
  hrShippingCents,
  priceOrder,
} from './commerce.ts'

const ship = { shippingCents: 499, freeThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS, euShippingCents: 999 }

test('discount applies only under 40 €', () => {
  assert.equal(FREE_SHIPPING_THRESHOLD_CENTS, 4000)
  assert.equal(discountCentsFor(3999, 2, true), Math.round(3999 * 0.1))
  assert.equal(discountCentsFor(4000, 2, true), 0)
  assert.equal(discountCentsFor(4500, 2, true), 0)
  assert.equal(discountCentsFor(3999, 1, true), 0)
  assert.equal(discountCentsFor(3999, 2, false), 0)
})

test('free shipping starts at 40 €', () => {
  assert.equal(hrShippingCents(3999, ship.shippingCents), ship.shippingCents)
  assert.equal(hrShippingCents(4000, ship.shippingCents), 0)
  assert.equal(hrShippingCents(4500, ship.shippingCents), 0)
})

test('checkout totals stay the same for Stripe and the invoice', () => {
  const under = priceOrder(3999, 2, true, 'HR', ship)
  assert.deepEqual(under, { upsellDiscountCents: 400, promoDiscountCents: 0, discountCents: 400, shippingCents: 499, totalCents: 3999 - 400 + 499 })

  const exact = priceOrder(4000, 2, true, 'HR', ship)
  assert.deepEqual(exact, { upsellDiscountCents: 0, promoDiscountCents: 0, discountCents: 0, shippingCents: 0, totalCents: 4000 })

  const over = priceOrder(4500, 2, true, 'HR', ship)
  assert.deepEqual(over, { upsellDiscountCents: 0, promoDiscountCents: 0, discountCents: 0, shippingCents: 0, totalCents: 4500 })
})
