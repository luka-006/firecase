import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseSlug, planSlugUpdates, slugifyHr } from './product-slug.mjs'

test('the url follows the Croatian name, not the English one', () => {
  assert.equal(slugifyHr('Sorbet'), 'sorbet')
  assert.equal(slugifyHr('Saten za BIC J5'), 'saten-za-bic-j5')
  assert.equal(slugifyHr('Šećer'), 'secer')
  const plan = planSlugUpdates([
    { id: 12, slug: 'saten-za-bic-j5', nameHr: 'Sorbet', nameEn: 'Saten' },
  ])
  assert.deepEqual(plan, [{ id: 12, nameHr: 'Sorbet', from: 'saten-za-bic-j5', to: 'sorbet' }])
  assert.equal(plan[0].nameHr, 'Sorbet')
})

test('slug sync is idempotent and does not invent a rename when the url already matches', () => {
  const once = planSlugUpdates([
    { id: 1, slug: 'zephyr', nameHr: 'Zephyr' },
    { id: 2, slug: 'saten-za-bic-j5', nameHr: 'Sorbet' },
  ])
  assert.deepEqual(once.map((row) => [row.id, row.from, row.to]), [[2, 'saten-za-bic-j5', 'sorbet']])
  const again = planSlugUpdates([
    { id: 1, slug: 'zephyr', nameHr: 'Zephyr' },
    { id: 2, slug: 'sorbet', nameHr: 'Sorbet' },
  ], [{ slug: 'saten-za-bic-j5', productId: 2 }])
  assert.deepEqual(again, [])
})

test('two products with the same Croatian name keep distinct urls and stable ids', () => {
  const plan = planSlugUpdates([
    { id: 4, slug: 'stari-a', nameHr: 'Sorbet' },
    { id: 9, slug: 'stari-b', nameHr: 'Sorbet' },
  ])
  assert.equal(plan[0]?.to, 'sorbet')
  assert.equal(plan[1]?.to, 'sorbet-9')
  assert.equal(plan[0]?.id, 4)
  assert.equal(plan[1]?.id, 9)
  assert.equal(chooseSlug('Sorbet', 9, new Set(['sorbet'])), 'sorbet-9')
})

test('an existing alias blocks the slug so the old url keeps pointing at its product', () => {
  const plan = planSlugUpdates(
    [{ id: 3, slug: 'saten-za-bic-j5', nameHr: 'Sorbet' }],
    [{ slug: 'sorbet', productId: 1 }],
  )
  assert.equal(plan[0]?.to, 'sorbet-3')
  const again = planSlugUpdates(
    [{ id: 3, slug: 'sorbet-3', nameHr: 'Sorbet' }],
    [{ slug: 'sorbet', productId: 1 }, { slug: 'saten-za-bic-j5', productId: 3 }],
  )
  assert.deepEqual(again, [])
})
