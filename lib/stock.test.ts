import assert from 'node:assert/strict'
import test from 'node:test'
import {
  exceedsStock,
  headlineStock,
  isLowStock,
  isSoldOut,
  moveStock,
  needsStockAttention,
  optionStock,
  withLowStockFirst,
} from './stock.ts'
import { formatVariantLine, parseVariantLine } from './variants.ts'
import type { Variant } from './types.ts'

const v = (hr: string, stock?: number | null): Variant => (stock === undefined ? { hr, en: hr } : { hr, en: hr, stock })

test('unset stock stays unlimited and zero is sold out', () => {
  assert.equal(isSoldOut({ stock: null, variants: [] }), false)
  assert.equal(isLowStock({ stock: null, variants: [] }), false)
  assert.equal(headlineStock({ stock: null, variants: [] }), null)
  assert.equal(isSoldOut({ stock: 0, variants: [] }), true)
  assert.equal(isLowStock({ stock: 0, variants: [] }), false)
  assert.equal(isLowStock({ stock: 1, variants: [] }), true)
  assert.equal(isLowStock({ stock: 10, variants: [] }), true)
  assert.equal(isLowStock({ stock: 11, variants: [] }), false)
})

test('a variant number overrides the product, and one unlimited option is not low', () => {
  const mixed = { stock: 2, variants: [v('Crna', 4), v('Bijela')] }
  assert.equal(optionStock(mixed, 0), 4)
  assert.equal(optionStock(mixed, 1), 2)
  assert.equal(isSoldOut({ stock: 0, variants: [v('Crna', 5)] }), false)
  assert.equal(isSoldOut({ stock: null, variants: [v('Crna', 0), v('Bijela', 0)] }), true)
  assert.equal(isLowStock({ stock: 50, variants: [v('Crna', 2), v('Bijela')] }), false)
  assert.equal(isLowStock({ stock: 50, variants: [v('Crna', 2), v('Bijela', 0)] }), true)
  assert.equal(headlineStock({ stock: 2, variants: [v('Crna', 2), v('Bijela', 0)] }), 2)
  assert.equal(isLowStock({ stock: null, variants: [v('Crna', 2)] }), true)
  assert.equal(isLowStock({ stock: null, variants: [v('Crna', 2), v('Bijela')] }), false)
})

test('low stock keeps the previous order inside each group', () => {
  const list = [
    { id: 'a', stock: null, variants: [] },
    { id: 'b', stock: 3, variants: [] },
    { id: 'c', stock: 50, variants: [] },
    { id: 'd', stock: 1, variants: [] },
    { id: 'e', stock: 0, variants: [] },
  ]
  assert.deepEqual(withLowStockFirst(list).map((p) => p.id), ['b', 'd', 'a', 'c', 'e'])
})

test('checkout quantities are checked per variant and then against the shared product stock', () => {
  const product = { stock: 4, variants: [v('Crna', 2), v('Bijela')] }
  assert.equal(exceedsStock(product, [{ qty: 2, vi: 0 }]), false)
  assert.equal(exceedsStock(product, [{ qty: 3, vi: 0 }]), true)
  assert.equal(exceedsStock(product, [{ qty: 2, vi: 1 }, { qty: 2, variant: 'Bijela' }]), false)
  assert.equal(exceedsStock(product, [{ qty: 3, vi: 1 }, { qty: 2, variantIndex: 1 }]), true)
  assert.equal(exceedsStock(product, [{ qty: 2, vi: 0 }, { qty: 4, vi: 1 }]), false)
  assert.equal(exceedsStock({ stock: null, variants: [] }, [{ qty: 40 }]), false)
  assert.equal(exceedsStock({ stock: 0, variants: [] }, [{ qty: 1 }]), true)
})

test('paid orders take the bucket they used and a storno puts it back', () => {
  const start = { stock: 5, variants: [v('Crna', 2), v('Bijela')] }
  const taken = moveStock(start, [{ qty: 2, variantIndex: 0 }, { qty: 3, vi: 1 }], -1)
  assert.equal(taken.variants[0].stock, 0)
  assert.equal(taken.stock, 2)
  const back = moveStock(taken, [{ qty: 2, variant: 'Crna' }, { qty: 3, vi: 1 }], 1)
  assert.equal(back.variants[0].stock, 2)
  assert.equal(back.stock, 5)
  const clamped = moveStock({ stock: 1, variants: [v('Crna', 1)] }, [{ qty: 9, vi: 0 }, { qty: 9, vi: -1 }], -1)
  assert.equal(clamped.variants[0].stock, 0)
  assert.equal(clamped.stock, 0)
  assert.equal(moveStock({ stock: null, variants: [] }, [{ qty: 4 }], -1).stock, null)
})

test('admin lines round-trip an optional stock column', () => {
  assert.deepEqual(parseVariantLine('Crna | Black'), { hr: 'Crna', en: 'Black' })
  assert.deepEqual(parseVariantLine('Crna | Black | matte | 4'), { hr: 'Crna', en: 'Black', sup: 'matte', stock: 4 })
  const emptySup = parseVariantLine('Crna | Black |  | 4')
  assert.deepEqual(emptySup, { hr: 'Crna', en: 'Black', stock: 4 })
  assert.equal(formatVariantLine(emptySup!), 'Crna | Black |  | 4')
  assert.equal(parseVariantLine('Crna | Black |  | 4')?.stock, 4)
  assert.equal(needsStockAttention({ stock: null, variants: [v('Crna', 10)] }), true)
  assert.equal(needsStockAttention({ stock: 11, variants: [v('Crna')] }), false)
  assert.equal(needsStockAttention({ stock: 0, variants: [] }), true)
})
