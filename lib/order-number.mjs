import crypto from 'node:crypto'

/** Inclusive range for the customer-facing order number. */
export const ORDER_NUMBER_MIN = 100_000
export const ORDER_NUMBER_MAX = 999_999

export function randomOrderNumber() {
  return crypto.randomInt(ORDER_NUMBER_MIN, ORDER_NUMBER_MAX + 1)
}

/** Picks a 6-digit number that is not already in `used`, then records it. */
export function takeOrderNumber(used, rng = randomOrderNumber) {
  for (let i = 0; i < 64; i++) {
    const n = rng()
    if (!Number.isInteger(n) || n < ORDER_NUMBER_MIN || n > ORDER_NUMBER_MAX) continue
    if (used.has(n)) continue
    used.add(n)
    return n
  }
  throw new Error('Nije moguće dodijeliti broj narudžbe.')
}

export function isOrderNumberConflict(e) {
  if (!e || typeof e !== 'object') return false
  const err = e
  if (err.code !== '23505') return false
  const name = `${err.constraint_name ?? ''} ${err.constraint ?? ''} ${err.message ?? ''}`
  return /order_number/i.test(name)
}
