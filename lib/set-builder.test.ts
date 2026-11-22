import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILD_SET_MAX,
  builtSetFreeShipping,
  buildableCase,
  builtSetKey,
  builtSetPercent,
  builtSetSizeOk,
  nextBuiltSetTier,
  priceBuiltSet,
  soldOnlyInSet,
} from './set-builder.ts'

test('tiers: 2 cases no discount, 3-4 get 10%, 5-7 get 20%, 8 and more get 30%', () => {
  assert.equal(builtSetPercent(1), 0)
  assert.equal(builtSetPercent(2), 0)
  assert.equal(builtSetPercent(3), 10)
  assert.equal(builtSetPercent(4), 10)
  assert.equal(builtSetPercent(5), 20)
  assert.equal(builtSetPercent(7), 20)
  assert.equal(builtSetPercent(8), 30)
  assert.equal(builtSetPercent(10), 30)
})

test('8 cases and more ship free, fewer do not', () => {
  assert.equal(builtSetFreeShipping(7), false)
  assert.equal(builtSetFreeShipping(8), true)
  assert.equal(builtSetFreeShipping(10), true)
  const eight = priceBuiltSet(Array(8).fill(1299))
  assert.equal(eight.fullCents, 10392)
  assert.equal(eight.percent, 30)
  assert.equal(eight.totalCents, 7274)
  assert.equal(eight.freeShipping, true)
})

test('set price is the sum minus the tier, rounded to the cent', () => {
  assert.deepEqual(priceBuiltSet([1299, 1299]), { count: 2, fullCents: 2598, percent: 0, savedCents: 0, totalCents: 2598, freeShipping: false })
  assert.deepEqual(priceBuiltSet([1299, 1299, 1399]), { count: 3, fullCents: 3997, percent: 10, savedCents: 400, totalCents: 3597, freeShipping: false })
  const five = priceBuiltSet([1099, 1199, 1299, 1399, 1499])
  assert.equal(five.fullCents, 6495)
  assert.equal(five.percent, 20)
  assert.equal(five.totalCents, 5196)
  assert.equal(five.savedCents, 1299)
})

test('next tier tells how many cases are missing', () => {
  assert.deepEqual(nextBuiltSetTier(0), { need: 3, percent: 10, freeShipping: false })
  assert.deepEqual(nextBuiltSetTier(2), { need: 1, percent: 10, freeShipping: false })
  assert.deepEqual(nextBuiltSetTier(3), { need: 2, percent: 20, freeShipping: false })
  assert.deepEqual(nextBuiltSetTier(4), { need: 1, percent: 20, freeShipping: false })
  assert.deepEqual(nextBuiltSetTier(5), { need: 3, percent: 30, freeShipping: true })
  assert.equal(nextBuiltSetTier(8), null)
})

test('size limits', () => {
  assert.equal(builtSetSizeOk(1), false)
  assert.equal(builtSetSizeOk(2), true)
  assert.equal(builtSetSizeOk(BUILD_SET_MAX), true)
  assert.equal(builtSetSizeOk(BUILD_SET_MAX + 1), false)
})

test('same cases in another order give the same cart key', () => {
  assert.equal(builtSetKey([{ id: 3, vi: 0 }, { id: 1, vi: 2 }]), builtSetKey([{ id: 1, vi: 2 }, { id: 3, vi: 0 }]))
  assert.notEqual(builtSetKey([{ id: 1, vi: 0 }, { id: 1, vi: 1 }]), builtSetKey([{ id: 1, vi: 0 }, { id: 1, vi: 0 }]))
})

test('only plain published cases go into a built set and are sold only in a set', () => {
  assert.equal(buildableCase({ kind: 'product', engrave: false, active: true }), true)
  assert.equal(buildableCase({ kind: 'set', active: true }), false)
  assert.equal(buildableCase({ kind: 'product', engrave: true, active: true }), false)
  assert.equal(buildableCase({ kind: 'product', active: false }), false)
  assert.equal(soldOnlyInSet({ kind: 'product', engrave: false }), true)
  assert.equal(soldOnlyInSet({ kind: 'set' }), false)
  assert.equal(soldOnlyInSet({ kind: 'product', engrave: true }), false)
})
