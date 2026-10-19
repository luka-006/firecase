import assert from 'node:assert/strict'
import test from 'node:test'
import { t } from './dict.ts'
import { isPromoHeld, promoHoldUntil, PROMO_HOLD_SEC } from './promo.ts'
import { switchLocale } from './routes.ts'
import { contactMetaDescription, productMetaDescription } from './seo.ts'

const colour = (n: number) => t('hr').sizes(n)
const colours = (n: number) => t('en').sizes(n)

test('language switch drops an internal hr prefix', () => {
  assert.equal(switchLocale('/hr/proizvod/zephyr', 'en'), '/en/product/zephyr')
  assert.equal(switchLocale('/hr/product/zephyr', 'en'), '/en/product/zephyr')
  assert.equal(switchLocale('/hr/legal/contact', 'en'), '/en/contact')
  assert.equal(switchLocale('/trgovina', 'en'), '/en/shop')
  assert.equal(switchLocale('/en/shop', 'hr'), '/trgovina')
  assert.equal(switchLocale('/en/product/zephyr', 'hr'), '/proizvod/zephyr')
})

test('colour labels use the Croatian plural', () => {
  assert.equal(t('hr').colour, 'Boja')
  assert.equal(t('hr').variant, 'Boja')
  assert.equal(t('en').colour, 'Colour')
  assert.equal(t('en').variant, 'Colour')
  assert.equal(colour(1), '1 boja')
  assert.equal(colour(2), '2 boje')
  assert.equal(colour(3), '3 boje')
  assert.equal(colour(4), '4 boje')
  assert.equal(colour(5), '5 boja')
  assert.equal(colour(11), '11 boja')
  assert.equal(colour(21), '21 boja')
  assert.equal(colour(22), '22 boje')
  assert.equal(colours(1), '1 colour')
  assert.equal(colours(5), '5 colours')
  assert.equal(t('hr').termsAccusative, 'Uvjete poslovanja')
  assert.equal(t('hr').terms, 'Uvjeti poslovanja')
})

test('a reserved code stays held until the checkout window ends', () => {
  const now = new Date('2026-10-19T12:00:00Z')
  const until = promoHoldUntil(now)
  assert.equal((until.getTime() - now.getTime()) / 1000, PROMO_HOLD_SEC)
  assert.equal(PROMO_HOLD_SEC < 24 * 60 * 60, true)
  assert.equal(PROMO_HOLD_SEC >= 30 * 60, true)
  assert.equal(isPromoHeld({ reservedOrderId: 4, reservedUntil: until }, now), true)
  assert.equal(isPromoHeld({ reservedOrderId: 4, reservedUntil: now }, now), false)
  assert.equal(isPromoHeld({ reservedOrderId: null, reservedUntil: until }, now), false)
})

function inRange(text: string) {
  assert.equal(text.length >= 140 && text.length <= 160, true, `${text.length}: ${text}`)
}

test('product and contact meta descriptions stay within 140–160 characters', () => {
  const variants = [
    { hr: 'BIC J6 (standardni)', en: 'BIC J6 (regular)' },
    { hr: 'BIC J3 (mini)', en: 'BIC J3 (mini)' },
  ]
  inRange(productMetaDescription({
    locale: 'hr', name: 'Arabeska', short: 'Futrola čistih linija.', material: 'metal', variants, delivery: '8–16 dana',
  }))
  inRange(productMetaDescription({
    locale: 'en', name: 'Arabeska', short: 'A case with clean lines.', material: 'metal', variants, delivery: '8–16 days',
  }))
  inRange(productMetaDescription({
    locale: 'hr', name: 'Medaljon', short: '', material: '', variants: [], delivery: '8–16 dana',
  }))
  inRange(productMetaDescription({
    locale: 'en', name: 'Medaljon', short: 'A very long description that keeps going well past the limit so the meta description has to stop on a word and still mention delivery in eight to sixteen days without running on.', material: 'brushed steel', variants, delivery: '8–16 days',
  }))
  inRange(contactMetaDescription('hr'))
  inRange(contactMetaDescription('en'))
  assert.match(contactMetaDescription('hr'), /info@firecase.net/)
  assert.match(productMetaDescription({ locale: 'hr', name: 'Arabeska', short: '', material: '', variants: [], delivery: '8–16 dana' }), /8–16/)
})
