import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planPriceChanges, PRICE_BATCH_MAX } from './staff-prices.ts'

const rows = [
  { id: 1, slug: 'tiger', priceCents: 1299 },
  { id: 2, slug: 'sorbet', priceCents: 1099 },
]

test('known products get the new price and keep the old one for undo', () => {
  const plan = planPriceChanges(rows, [{ slug: 'tiger', priceCents: 799 }])
  assert.deepEqual(plan, { ok: true, changes: [{ id: 1, slug: 'tiger', from: 1299, to: 799 }] })
})

test('nothing is written when one product is unknown', () => {
  const plan = planPriceChanges(rows, [{ slug: 'tiger', priceCents: 799 }, { slug: 'nope', priceCents: 799 }])
  assert.equal(plan.ok, false)
  assert.deepEqual(!plan.ok && plan.slugs, ['nope'])
})

test('a zero, fractional or huge price is refused', () => {
  for (const priceCents of [0, 50, 799.5, 100001]) {
    const plan = planPriceChanges(rows, [{ slug: 'tiger', priceCents }])
    assert.equal(plan.ok, false, String(priceCents))
  }
})

test('the same product twice is refused', () => {
  const plan = planPriceChanges(rows, [{ slug: 'tiger', priceCents: 799 }, { slug: 'tiger', priceCents: 899 }])
  assert.equal(plan.ok, false)
  assert.deepEqual(!plan.ok && plan.slugs, ['tiger'])
})

test('empty and oversized batches are refused', () => {
  assert.equal(planPriceChanges(rows, []).ok, false)
  const many = Array.from({ length: PRICE_BATCH_MAX + 1 }, (_, i) => ({ slug: `p${i}`, priceCents: 799 }))
  assert.equal(planPriceChanges(rows, many).ok, false)
})
