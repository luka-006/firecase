import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SUPPLIER_NOTE,
  formatSupplierPhone,
  orderStage,
  resolveSupplierLine,
  stageLabel,
  supplierAddressBlock,
  supplierAddressFields,
} from './supplier-order.ts'
import type { OrderItem, Variant } from './types.ts'
import { formatStaffVariantLine, mergeSupplierFromProposal, parseStaffVariantLine, publicVariants, variantsFromAdminForm } from './variants.ts'

const item = (patch: Partial<OrderItem> = {}): OrderItem => ({
  productId: 3,
  slug: 'zephyr',
  name: 'Zephyr',
  variant: 'Siva',
  qty: 2,
  unitCents: 1499,
  ...patch,
})

test('accepted proposal fills only empty supplier mapping', () => {
  const product = {
    supplierUrl: '',
    variants: [
      { hr: 'Siva', en: 'Grey', stock: 4 },
      { hr: 'Crna', en: 'Black', sup: 'već upisano' },
    ] as Variant[],
  }
  const proposal = {
    supplierUrl: 'https://example.com/item/1',
    variants: [
      { hr: 'siva', en: 'Grey', sup: 'No2 silver grey', supplierSku: 'AE-2', supplierNote: 'mat' },
      { hr: 'Crna', en: 'Black', sup: 'druga' },
      { hr: 'Nova', en: 'New', sup: 'ne diraj katalog' },
    ] as Variant[],
  }
  const next = mergeSupplierFromProposal(product, proposal)
  assert.equal(next.supplierUrl, proposal.supplierUrl)
  assert.equal(next.variants.length, 2)
  assert.equal(next.variants[0].sup, 'No2 silver grey')
  assert.equal(next.variants[0].supplierSku, 'AE-2')
  assert.equal(next.variants[0].supplierNote, 'mat')
  assert.equal(next.variants[0].stock, 4)
  assert.equal(next.variants[1].sup, 'već upisano')
  assert.equal(mergeSupplierFromProposal({ supplierUrl: 'https://vec.hr', variants: [] }, proposal).supplierUrl, 'https://vec.hr')
  assert.deepEqual(mergeSupplierFromProposal({ supplierUrl: '', variants: [] }, proposal).variants, [])
})

test('admin variant json keeps sku and the old pipe line keeps stock', () => {
  const fromJson = variantsFromAdminForm(JSON.stringify([
    { hr: 'Siva', en: 'Grey', sup: 'No2 silver grey', supplierSku: 'AE-2', supplierNote: 'mat', stock: 4 },
    { hr: '  ', en: 'x' },
  ]))
  assert.deepEqual(fromJson, [{ hr: 'Siva', en: 'Grey', sup: 'No2 silver grey', supplierSku: 'AE-2', supplierNote: 'mat', stock: 4 }])
  assert.deepEqual(variantsFromAdminForm('Crna | Black | matte | 4'), [{ hr: 'Crna', en: 'Black', sup: 'matte', stock: 4 }])
  assert.deepEqual(publicVariants(fromJson), [{ hr: 'Siva', en: 'Grey', stock: 4 }])
})

test('staff line keeps option, sku and note', () => {
  const line = 'Siva | Grey | No2 silver grey | AE-2 | ne šalji račun'
  const parsed = parseStaffVariantLine(line)
  assert.deepEqual(parsed, { hr: 'Siva', en: 'Grey', sup: 'No2 silver grey', supplierSku: 'AE-2', supplierNote: 'ne šalji račun' })
  assert.equal(formatStaffVariantLine(parsed!), line)
  assert.deepEqual(parseStaffVariantLine('Crna | Black | matte'), { hr: 'Crna', en: 'Black', sup: 'matte' })
})

test('paid orders wait for a supplier number, then show ordered', () => {
  assert.equal(orderStage({ status: 'paid', supplierOrder: '' }), 'todo')
  assert.equal(orderStage({ status: 'paid', supplierOrder: '  ' }), 'todo')
  assert.equal(orderStage({ status: 'paid', supplierOrder: '812345' }), 'ordered')
  assert.equal(orderStage({ status: 'shipped', supplierOrder: '' }), 'shipped')
  assert.equal(stageLabel('todo'), 'Čeka narudžbu kod dobavljača')
  assert.equal(stageLabel('ordered'), 'Naručeno kod dobavljača')
})

test('address copy follows the supplier form and adds the calling code', () => {
  const fields = supplierAddressFields({
    name: 'Ana Horvat',
    phone: '091 123-4567',
    address: 'Ilica 1',
    postal: '21000',
    city: 'Split',
    country: 'HR',
  })
  assert.deepEqual(fields.map((field) => field.label), [
    'Ime i prezime', 'Telefon', 'Ulica i broj', 'Poštanski broj', 'Grad', 'Županija', 'Država',
  ])
  assert.deepEqual(fields.map((field) => field.value), [
    'Ana Horvat', '+385911234567', 'Ilica 1', '21000', 'Split', 'Splitsko-dalmatinska', 'Hrvatska',
  ])
  assert.equal(supplierAddressBlock(fields), fields.map((field) => field.value).join('\n'))
  assert.equal(formatSupplierPhone('+385 91 123 4567', 'HR'), '+385911234567')
  assert.equal(formatSupplierPhone('00385911234567', 'HR'), '+385911234567')
  assert.equal(formatSupplierPhone('0171123456', 'DE'), '+49171123456')

  const abroad = supplierAddressFields({
    name: 'Mia', phone: '', address: 'Haupt 2', postal: '1010', city: 'Beč', country: 'AT',
  })
  assert.equal(abroad.some((field) => field.key === 'region'), false)
  assert.equal(abroad.at(-1)?.value, 'Austrija')
  assert.equal(supplierAddressBlock(abroad).includes('\n\n'), false)
})

test('supplier note is the dropshipping sentence and missing mapping is flagged', () => {
  assert.equal(SUPPLIER_NOTE, 'Dropshipping order. Please do not include any invoice, price, receipt, or seller advertising in the parcel. Thank you.')
  const mapped = resolveSupplierLine(item({ supplierUrl: 'https://example.com/item', supplierOption: 'No2 silver grey', supplierSku: 'AE-2' }))
  assert.equal(mapped.missingUrl, false)
  assert.equal(mapped.missingOption, false)
  assert.equal(mapped.option, 'No2 silver grey')

  const fromProduct = resolveSupplierLine(item(), {
    supplierUrl: 'https://example.com/item',
    variants: [{ hr: 'Siva', en: 'Grey', sup: 'No2 silver grey', supplierSku: 'AE-2', supplierNote: 'mat' }],
  })
  assert.equal(fromProduct.url, 'https://example.com/item')
  assert.equal(fromProduct.option, 'No2 silver grey')
  assert.equal(fromProduct.sku, 'AE-2')
  assert.equal(fromProduct.note, 'mat')

  const missing = resolveSupplierLine(item(), { supplierUrl: '', variants: [{ hr: 'Siva', en: 'Grey' }] })
  assert.equal(missing.missingUrl, true)
  assert.equal(missing.missingOption, true)

  const single = resolveSupplierLine(item({ variant: '' }), { supplierUrl: 'https://example.com/item', variants: [] })
  assert.equal(single.missingUrl, false)
  assert.equal(single.missingOption, false)
})
