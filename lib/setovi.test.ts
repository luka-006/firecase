import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SET_ENTITY_LABEL,
  SET_ITEM_MAX,
  SET_ITEM_MIN,
  cartHasFreeShipping,
  catalogueCases,
  catalogueSets,
  acceptedSetEditHref,
  inactiveAcceptedSetCanPublish,
  isPendingSetProposalStatus,
  setIsPublicOnAccept,
  isSetProduct,
  mixHomeCollection,
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

test('accepting a set stays hidden until the owner publishes it', () => {
  assert.equal(setIsPublicOnAccept(1099), false)
  assert.equal(setIsPublicOnAccept(0), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'accepted', priceCents: 1099, active: false }), true)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'accepted', priceCents: 1099, active: true }), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'draft', priceCents: 1099, active: false }), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'review', priceCents: 1099, active: false }), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'rejected', priceCents: 1099, active: false }), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'product', proposalStatus: 'accepted', priceCents: 1099, active: false }), false)
  assert.equal(inactiveAcceptedSetCanPublish({ kind: 'set', proposalStatus: 'accepted', priceCents: 0, active: false }), false)
  assert.equal(acceptedSetEditHref(28, 'accepted'), '/admin/products/28')
  assert.equal(acceptedSetEditHref(28, 'draft'), null)
  assert.equal(acceptedSetEditHref(null, 'accepted'), null)
})

test('only draft and review proposals can have their images replaced', () => {
  assert.equal(isPendingSetProposalStatus('draft'), true)
  assert.equal(isPendingSetProposalStatus('review'), true)
  assert.equal(isPendingSetProposalStatus('accepted'), false)
  assert.equal(isPendingSetProposalStatus('rejected'), false)
  assert.equal(isPendingSetProposalStatus('pending'), false)
  assert.equal(isPendingSetProposalStatus(''), false)
})

test('the public catalogue shows only published sets and cases', () => {
  const rows = [
    { id: 1, kind: 'product', active: true, name: 'Zephyr' },
    { id: 2, kind: 'set', active: true, name: 'Set Trio' },
    { id: 3, kind: 'set', active: false, name: 'Neobjavljeni set' },
    { id: 4, kind: 'product', active: false, name: 'Skrivena futrola' },
    { id: 5, kind: undefined, active: true, name: 'Noir' },
  ]
  assert.equal(isSetProduct(rows[1]), true)
  assert.equal(isSetProduct(rows[0]), false)
  assert.deepEqual(catalogueSets(rows).map((row) => row.name), ['Set Trio'])
  assert.deepEqual(catalogueCases(rows).map((row) => row.name), ['Zephyr', 'Noir'])
  const manyCases = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: i, kind: 'product' as const, active: true })),
    { id: 20, kind: 'set' as const, active: true },
    { id: 21, kind: 'set' as const, active: false },
  ]
  const mixed = mixHomeCollection(manyCases, 8)
  assert.equal(mixed.length, 8)
  assert.equal(mixed.filter(isSetProduct).length, 1)
  assert.equal(mixed.some((row) => row.id === 21), false)
  assert.equal(mixed[0]?.kind, 'product')
  assert.equal(mixed[1]?.kind, 'set')
  assert.deepEqual(mixHomeCollection(catalogueCases(rows)).map((row) => row.id), [1, 5])
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
