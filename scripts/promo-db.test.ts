import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

const hasDb = Boolean(process.env.DATABASE_URL)

test('one code cannot be reserved twice, and a used code is reissued', { skip: hasDb ? false : 'DATABASE_URL unset' }, async () => {
  const { sql } = await import('../lib/db.ts')
  const { findPromo, issueReviewCode, markPromoUsed, releasePromoReservation, reservePromo } = await import('../lib/discount-codes.ts')
  const { checkRateLimit, clearRateLimit, hitRateLimit } = await import('../lib/auth/rate-limit.ts')
  const { promoHoldUntil, randomPromoCode } = await import('../lib/promo.ts')

  const stamp = Date.now()
  const orderIds: number[] = []
  const codeIds: number[] = []
  const bucket = `qa-${stamp}`

  async function order() {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const [row] = await sql<{ id: number }[]>`
          insert into orders (public_id, order_number, email, name, address, city, postal, items, subtotal_cents, shipping_cents, total_cents)
          values (${crypto.randomBytes(9).toString('hex')}, ${200000 + Math.floor(Math.random() * 700000)}, ${`qa-${stamp}@example.com`}, 'QA', 'Ulica 1', 'Knin', '22300', ${sql.json([])}, 1000, 0, 1000)
          returning id`
        orderIds.push(row.id)
        return row
      } catch (e) {
        if (attempt === 7) throw e
      }
    }
    throw new Error('order')
  }

  try {
    const a = await order()
    const b = await order()
    const code = randomPromoCode()
    const [created] = await sql<{ id: number; code: string }[]>`
      insert into discount_codes (code, percent, email, single_use, expires_at)
      values (${code}, 5, 'qa@example.com', true, now() + interval '60 days')
      returning id, code`
    codeIds.push(created.id)

    const until = promoHoldUntil()
    assert.equal(await reservePromo(created.id, a.id, until), true)
    assert.equal(await reservePromo(created.id, b.id, until), false)
    const held = await findPromo(created.code)
    assert.equal(held.ok, false)
    if (!held.ok) assert.equal(held.reason, 'reserved')

    await releasePromoReservation(a.id)
    const free = await findPromo(created.code)
    assert.equal(free.ok, true)
    assert.equal(await reservePromo(created.id, b.id, until), true)
    assert.equal(await markPromoUsed(created.id, b.id), true)
    assert.equal(await markPromoUsed(created.id, a.id), false)

    const issued = await issueReviewCode({ id: a.id, email: 'qa@example.com' })
    codeIds.push(issued.id)
    const again = await issueReviewCode({ id: a.id, email: 'qa@example.com' })
    assert.equal(again.code, issued.code)

    assert.equal(await markPromoUsed(issued.id, a.id), true)
    const replacement = await issueReviewCode({ id: a.id, email: 'qa@example.com' })
    codeIds.push(replacement.id)
    assert.notEqual(replacement.code, issued.code)
    assert.equal(replacement.issuedOrderId, a.id)

    await sql`update discount_codes set expires_at = now() - interval '1 day', used_at = null, used_order_id = null where id = ${replacement.id}`
    const afterExpiry = await issueReviewCode({ id: a.id, email: 'qa@example.com' })
    codeIds.push(afterExpiry.id)
    assert.notEqual(afterExpiry.code, replacement.code)

    const opts = { maxHits: 10, windowSec: 60 }
    for (let i = 0; i < 10; i++) {
      assert.equal((await checkRateLimit('promo_code_test', bucket, opts)).ok, true)
      await hitRateLimit('promo_code_test', bucket, opts)
    }
    assert.equal((await checkRateLimit('promo_code_test', bucket, opts)).ok, false)
  } finally {
    await clearRateLimit('promo_code_test', bucket).catch(() => {})
    if (codeIds.length) await sql`delete from discount_codes where id in ${sql(codeIds)}`.catch(() => {})
    if (orderIds.length) await sql`delete from orders where id in ${sql(orderIds)}`.catch(() => {})
  }
})
