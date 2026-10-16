import assert from 'node:assert/strict'
import test from 'node:test'
import { ORDER_NUMBER_MAX, ORDER_NUMBER_MIN, isOrderNumberConflict, takeOrderNumber } from './order-number.mjs'

test('order numbers are 6-digit, unique and not a sequence', () => {
  const used = new Set<number>()
  const nums = Array.from({ length: 40 }, () => takeOrderNumber(used))
  assert.equal(new Set(nums).size, 40)
  for (const n of nums) assert.ok(n >= ORDER_NUMBER_MIN && n <= ORDER_NUMBER_MAX)
  const sorted = [...nums].sort((a, b) => a - b)
  const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
  assert.equal(consecutive, false)
})

test('order numbers skip collisions', () => {
  const used = new Set<number>([111111])
  const draws = [111111, 111111, 482913]
  let i = 0
  const n = takeOrderNumber(used, () => draws[i++])
  assert.equal(n, 482913)
  assert.equal(i, 3)
  assert.ok(used.has(482913))
})

test('order number conflict is the unique index, not every database error', () => {
  assert.equal(isOrderNumberConflict({ code: '23505', constraint_name: 'orders_order_number_key' }), true)
  assert.equal(isOrderNumberConflict({ code: '23505', message: 'duplicate key value violates unique constraint "orders_public_id_key"' }), false)
  assert.equal(isOrderNumberConflict({ code: '23502', constraint_name: 'orders_order_number_key' }), false)
})
