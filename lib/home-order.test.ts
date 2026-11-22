import assert from 'node:assert/strict'
import test from 'node:test'
import { hourSeed, interleaveSets, isOnSale, salePercent, seededRandom, shuffle } from './home-order.ts'

test('a seeded shuffle is repeatable and keeps every item', () => {
  const list = Array.from({ length: 22 }, (_, i) => i)
  const a = shuffle(list, seededRandom(7))
  const b = shuffle(list, seededRandom(7))
  const c = shuffle(list, seededRandom(8))
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, c)
  assert.deepEqual([...a].sort((x, y) => x - y), list)
  assert.deepEqual(list, Array.from({ length: 22 }, (_, i) => i), 'the input is not changed')
})

test('the hour seed changes on the hour, not between cache refreshes', () => {
  const t = Date.UTC(2026, 10, 17, 16, 0, 0)
  assert.equal(hourSeed(t), hourSeed(t + 59 * 60_000))
  assert.notEqual(hourSeed(t), hourSeed(t + 60 * 60_000))
})

test('cases and sets alternate, and the limit is respected', () => {
  const items = [{ n: 'a' }, { n: 'b' }, { n: 's1', set: true }, { n: 'c' }, { n: 's2', set: true }, { n: 'd' }]
  assert.deepEqual(interleaveSets(items).map((x) => x.n), ['a', 's1', 'b', 's2', 'c', 'd'])
  assert.deepEqual(interleaveSets(items, 3).map((x) => x.n), ['a', 's1', 'b'])
  assert.deepEqual(interleaveSets([{ n: 'x' }], 8).map((x) => x.n), ['x'])
})

test('on sale means a higher crossed-out price', () => {
  assert.equal(isOnSale({ priceCents: 1199, compareCents: 1399 }), true)
  assert.equal(isOnSale({ priceCents: 1199, compareCents: null }), false)
  assert.equal(isOnSale({ priceCents: 1199, compareCents: 1199 }), false)
  assert.equal(isOnSale({ priceCents: 1399, compareCents: 1199 }), false)
})

test('the badge percentage is measured against the 30-day lowest price only', () => {
  assert.equal(salePercent(1199, 1399), 14)
  assert.equal(salePercent(1399, 1599), 12)
  assert.equal(salePercent(1199, null), null, 'no price history: no number')
  assert.equal(salePercent(1199, 1199), null, 'no real reduction in 30 days: no number')
  assert.equal(salePercent(1000, 1005), null, 'under 1 %: no number')
})
