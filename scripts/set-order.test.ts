import assert from 'node:assert/strict'
import test from 'node:test'
import { componentSnapshots, supplierViewLines } from '../lib/set-order'
import type { OrderItem, Product } from '../lib/types'

function product(patch: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    slug: 'zephyr',
    nameHr: 'Zephyr',
    nameEn: '',
    shortHr: '',
    shortEn: '',
    descHr: '',
    descEn: '',
    priceCents: 1490,
    compareCents: null,
    images: ['/zephyr.jpg'],
    variants: [],
    fits: '',
    stock: null,
    active: true,
    featured: false,
    sort: 0,
    sku: '',
    materialHr: '',
    materialEn: '',
    manufacturer: '',
    euResponsible: '',
    safetyHr: '',
    safetyEn: '',
    supplierUrl: 'https://example.com/zephyr',
    costCents: 400,
    ...patch,
  }
}

test('ordering a set snapshots each included case', () => {
  const snap = componentSnapshots(
    [{ productId: 2, slug: 'noir' }, { productId: 4, slug: 'ash' }],
    [
      product({ id: 2, slug: 'noir', nameHr: 'Noir', supplierUrl: 'https://example.com/noir', variants: [{ hr: 'J6', en: 'J6', sup: 'black' }] }),
      product({ id: 4, slug: 'ash', nameHr: 'Ash', stock: 0 }),
    ],
    'hr',
  )
  assert.equal(snap.ok, false)

  const ok = componentSnapshots(
    [{ productId: 2, slug: 'noir' }],
    [product({ id: 2, slug: 'noir', nameHr: 'Noir', supplierUrl: 'https://example.com/noir', variants: [{ hr: 'J6', en: 'J6', sup: 'black' }] })],
    'hr',
  )
  assert.equal(ok.ok, true)
  if (!ok.ok) return
  assert.equal(ok.components[0]?.supplierOption, 'black')
  assert.equal(ok.components[0]?.variant, 'J6')
})

test('supplier lines for a set are the included cases', () => {
  const set: OrderItem = {
    productId: 9,
    slug: 'set-trio',
    name: 'Set Trio',
    variant: '',
    qty: 2,
    unitCents: 3990,
    components: [
      { productId: 2, slug: 'noir', name: 'Noir', qty: 1, unitCents: 1490, supplierUrl: 'https://example.com/noir', costCents: 400 },
      { productId: 3, slug: 'zephyr', name: 'Zephyr', qty: 1, unitCents: 1590, supplierUrl: '', costCents: 500 },
    ],
  }
  const single: OrderItem = {
    productId: 8,
    slug: 'solo',
    name: 'Solo',
    variant: '',
    qty: 1,
    unitCents: 1400,
    supplierUrl: 'https://example.com/solo',
    costCents: 300,
  }
  const lines = supplierViewLines([set, single], [
    { id: 3, supplierUrl: 'https://example.com/zephyr', variants: [], costCents: 500 },
  ])
  assert.equal(lines.length, 3)
  assert.equal(lines[0]?.name, 'Set Trio: Noir')
  assert.equal(lines[0]?.qty, 2)
  assert.equal(lines[0]?.url, 'https://example.com/noir')
  assert.equal(lines[1]?.url, 'https://example.com/zephyr')
  assert.equal(lines[1]?.qty, 2)
  assert.equal(lines[2]?.name, 'Solo')
  assert.equal(lines[2]?.url, 'https://example.com/solo')
})
