import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SET_ENTITY_LABEL,
  SET_ITEM_MAX,
  SET_ITEM_MIN,
  cartHasFreeShipping,
  orderStockGroups,
  quoteSet,
} from './setovi.ts'

test('the admin name stays on one constant', () => {
  assert.equal(SET_ENTITY_LABEL, 'Setovi')
})

test('zasebno is the live sum and is not a previous set price', () => {
  const quote = quoteSet(3000, [
    { priceCents: 1500, costCents: 400 },
    { priceCents: 1200, costCents: 300 },
    { priceCents: 900, costCents: 200 },
  ])
  assert.equal(quote.complete, true)
  assert.equal(quote.separateCents, 3600)
  assert.equal(quote.savingsCents, 600)
  assert.equal(quote.costCents, 900)
  assert.equal(quote.marginCents, 2100)
  assert.equal('compareCents' in quote, false)
})

test('a missing case price or cost leaves the matching total empty', () => {
  const missing = quoteSet(3000, [
    { priceCents: 1500, costCents: 400 },
    { priceCents: 0, costCents: null, missing: true },
    { priceCents: 900, costCents: 200 },
  ])
  assert.equal(missing.complete, false)
  assert.equal(missing.separateCents, null)
  assert.equal(missing.costCents, null)

  const noCost = quoteSet(3000, [
    { priceCents: 1500, costCents: 400 },
    { priceCents: 1200, costCents: null },
    { priceCents: 900, costCents: 200 },
  ])
  assert.equal(noCost.separateCents, 3600)
  assert.equal(noCost.costCents, null)
  assert.equal(noCost.marginCents, null)
})

test('a set lists three to five cases', () => {
  assert.equal(SET_ITEM_MIN, 3)
  assert.equal(SET_ITEM_MAX, 5)
})

test('free shipping is detected from a cart line', () => {
  assert.equal(cartHasFreeShipping([{ freeShipping: false }, { freeShipping: true }]), true)
  assert.equal(cartHasFreeShipping([{ }, { freeShipping: false }]), false)
})

test('stock for a set also covers each included case', () => {
  const groups = orderStockGroups([{
    productId: 9,
    qty: 2,
    components: [
      { productId: 2, qty: 1 },
      { productId: 9, qty: 1 },
      { productId: 3, qty: 1, variantIndex: 0 },
    ],
  }])
  const byId = Object.fromEntries(groups.map((group) => [group.productId, group.lines]))
  assert.deepEqual(byId[9], [{ qty: 2, variant: undefined, variantIndex: undefined }])
  assert.deepEqual(byId[2], [{ qty: 2, variant: undefined, variantIndex: undefined }])
  assert.equal(byId[3]?.[0]?.qty, 2)
  assert.equal(byId[3]?.[0]?.variantIndex, 0)
})
