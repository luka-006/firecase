import assert from 'node:assert/strict'
import test from 'node:test'

const hasDb = Boolean(process.env.DATABASE_URL)

test('slug sync keeps the Croatian name and leaves a redirect for the old url', { skip: hasDb ? false : 'DATABASE_URL unset' }, async () => {
  const postgres = (await import('postgres')).default
  const { syncProductSlugs } = await import('../lib/product-slug.mjs')
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} })
  const stamp = `slug-sync-${Date.now()}`
  const nameHr = `Probe ${stamp}`
  const expected = `probe-${stamp}`
  try {
    let applied: { id: number; nameHr: string; from: string; to: string }[] = []
    let stored: { slug: string; name_hr: string; name_en: string; price_cents: number } | undefined
    let alias: { slug: string } | undefined
    try {
      await sql.begin(async (tx) => {
        const [row] = await tx`
          insert into products (slug, name_hr, name_en, price_cents, active)
          values (${`${stamp}-old`}, ${nameHr}, 'Saten', 1099, true)
          returning id`
        applied = await syncProductSlugs(tx)
        const again = await syncProductSlugs(tx)
        if (again.some((change) => change.id === row.id)) throw new Error('second sync changed the fixture')
        const [after] = await tx`select slug, name_hr, name_en, price_cents from products where id = ${row.id}`
        const [old] = await tx`select slug from product_slug_aliases where product_id = ${row.id} and slug = ${`${stamp}-old`}`
        stored = after
        alias = old
        throw new Error('rollback')
      })
    } catch (e) {
      if ((e as Error).message !== 'rollback') throw e
    }
    const mine = applied.find((row) => row.nameHr === nameHr && row.from === `${stamp}-old`)
    assert.equal(mine?.to, expected)
    assert.equal(stored?.name_hr, nameHr)
    assert.equal(stored?.name_en, 'Saten')
    assert.equal(stored?.price_cents, 1099)
    assert.equal(stored?.slug, expected)
    assert.equal(alias?.slug, `${stamp}-old`)
    const [left] = await sql`select id from products where slug = ${`${stamp}-old`}`
    assert.equal(left, undefined)
  } finally {
    await sql.end()
  }
})
