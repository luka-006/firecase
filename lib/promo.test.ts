import assert from 'node:assert/strict'
import test from 'node:test'
import { FREE_SHIPPING_THRESHOLD_CENTS, priceOrder, promoCentsFor, stripeCouponName } from './commerce.ts'
import { invoiceDiscountLines } from './invoice-lines.ts'
import { isPromoUsable, normalizePromoCode, PROMO_PERCENT, randomPromoCode } from './promo.ts'

const ship = { shippingCents: 499, freeThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS, euShippingCents: 999 }

test('review codes are FC- plus six unguessable characters', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 20; i++) {
    const code = randomPromoCode()
    assert.match(code, /^FC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    seen.add(code)
  }
  assert.equal(seen.size, 20)
  assert.equal(normalizePromoCode('hello'), '')
  assert.equal(normalizePromoCode('FC-OOO111'), '')
  assert.equal(normalizePromoCode('FC-AB23CD'), 'FC-AB23CD')
  assert.equal(normalizePromoCode('fc-hk2345'), 'FC-HK2345')
})

test('a code is single use and expires', () => {
  const now = new Date('2026-10-19T12:00:00Z')
  const later = new Date('2026-12-18T12:00:00Z')
  assert.equal(isPromoUsable({ usedAt: null, expiresAt: later }, now), 'ok')
  assert.equal(isPromoUsable({ usedAt: now, expiresAt: later }, now), 'used')
  assert.equal(isPromoUsable({ usedAt: null, expiresAt: now }, now), 'expired')
})

test('5% and 10% stay separate and shipping uses the subtotal before discounts', () => {
  assert.equal(PROMO_PERCENT, 5)
  assert.equal(promoCentsFor(2000, 5), 100)

  const both = priceOrder(3000, 2, true, 'HR', ship, 5)
  assert.equal(both.upsellDiscountCents, 300)
  assert.equal(both.promoDiscountCents, 150)
  assert.equal(both.discountCents, 450)
  assert.equal(both.shippingCents, 499)
  assert.equal(both.totalCents, 3000 - 450 + 499)

  const withCode = priceOrder(4200, 1, false, 'HR', ship, 5)
  assert.equal(withCode.promoDiscountCents, 210)
  assert.equal(withCode.upsellDiscountCents, 0)
  assert.equal(withCode.shippingCents, 0)
  assert.equal(withCode.totalCents, 4200 - 210)

  const under = priceOrder(3800, 1, false, 'HR', ship, 5)
  assert.equal(under.promoDiscountCents, 190)
  assert.equal(under.shippingCents, ship.shippingCents)
  assert.equal(under.totalCents, 3800 - 190 + ship.shippingCents)

  const underUpsell = priceOrder(3800, 2, true, 'HR', ship, 0)
  assert.equal(underUpsell.upsellDiscountCents, 380)
  assert.equal(underUpsell.shippingCents, ship.shippingCents)
  assert.equal(underUpsell.totalCents, 3800 - 380 + ship.shippingCents)
})

test('invoice and email lines keep the 10% and the 5% apart', () => {
  const lines = invoiceDiscountLines({
    discountCents: 450,
    upsellDiscountCents: 300,
    promoDiscountCents: 150,
    promoCode: 'FC-HK2345',
  })
  assert.deepEqual(lines, [
    { labelHr: 'Popust 10%', labelEn: 'Discount 10%', unitCents: -300 },
    { labelHr: 'Popust 5% (FC-HK2345)', labelEn: 'Discount 5% (FC-HK2345)', unitCents: -150 },
  ])
  const stripeOff = lines.reduce((sum, line) => sum - line.unitCents, 0)
  assert.equal(stripeOff, 450)
  const coupon = stripeCouponName(['Popust 10%', 'Popust 5% FC-HK2345'], 'Popust')
  assert.equal(coupon, 'Popust 10% + Popust 5% FC-HK2345')
  assert.ok(coupon.length <= 40)
  assert.equal(stripeCouponName(['Discount 10%', '5% off FC-HK2345'], 'Discount'), 'Discount 10% + 5% off FC-HK2345')

  const legacy = invoiceDiscountLines({ discountCents: 400 })
  assert.equal(legacy[0].labelHr, 'Popust 10%')
  assert.equal(legacy[0].unitCents, -400)

  const storno = invoiceDiscountLines({ upsellDiscountCents: -300, promoDiscountCents: -150, promoCode: 'FC-HK2345' })
  assert.equal(storno[0].unitCents, 300)
  assert.equal(storno[1].unitCents, 150)
})
