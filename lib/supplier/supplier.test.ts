import assert from 'node:assert/strict'
import { test } from 'node:test'
import { supplierDestination, supplierPhone } from './address.ts'
import { safeSupplierMessage, shopOrderIdFromNumber, supplierId, supplierOrderNumber } from './ids.ts'
import { agingMaxDays, pickLogistic, supplierShipped, supplierTrackingShipped } from './logistic.ts'
import { supplierWebhookSign, supplierWebhookSignOk } from './sign.ts'

test('webhook signature matches the documented vector', () => {
  const body = '{"messageId":"123111","messageType":"INSERT","params":"123","type":"PRODUCT"}'
  const sign = supplierWebhookSign('123', body)
  assert.equal(sign, 'AHxoGFMoS/4mZfJ5vFes5//Pz2QibFQhh3GlrTtnWpk=')
  assert.equal(supplierWebhookSignOk('123', body, sign), true)
  assert.equal(supplierWebhookSignOk('123', body, 'nope'), false)
  assert.equal(supplierWebhookSignOk('', body, sign), false)
})

test('order number is stable and reversible', () => {
  assert.equal(supplierOrderNumber(42), 'FC-42')
  assert.equal(shopOrderIdFromNumber('FC-42'), 42)
  assert.equal(shopOrderIdFromNumber('other'), null)
  assert.equal(supplierId(' vid 123 '), 'vid123')
})

test('supplier messages never keep an api key', () => {
  assert.equal(safeSupplierMessage('bad CJ12345@api@secret-token here'), 'bad *** here')
})

test('cheapest option inside the day cap wins', () => {
  const options = [
    { logisticName: 'Slow', logisticPrice: 1.2, logisticAging: '20-40' },
    { logisticName: 'Parcel', logisticPrice: 3.4, logisticAging: '8-16' },
    { logisticName: 'Fast', logisticPrice: 9, logisticAging: '3-5' },
  ]
  assert.equal(agingMaxDays('8-16'), 16)
  assert.equal(pickLogistic(options, { mode: 'auto', name: '', maxDays: 20 })?.logisticName, 'Parcel')
  assert.equal(pickLogistic(options, { mode: 'name', name: 'Fast', maxDays: 20 })?.logisticName, 'Fast')
  assert.equal(pickLogistic(options, { mode: 'auto', name: '', maxDays: 5 })?.logisticName, 'Fast')
  assert.equal(pickLogistic([], { mode: 'auto', name: '', maxDays: 20 }), null)
})

test('shipped status', () => {
  assert.equal(supplierShipped('SHIPPED'), true)
  assert.equal(supplierShipped('DELIVERED'), true)
  assert.equal(supplierShipped('500'), true)
  assert.equal(supplierShipped('UNPAID'), false)
  assert.equal(supplierShipped('300'), false)
  assert.equal(supplierTrackingShipped(1), true)
  assert.equal(supplierTrackingShipped(12), true)
  assert.equal(supplierTrackingShipped(0), false)
  assert.equal(supplierTrackingShipped(3), false)
  assert.equal(supplierTrackingShipped(13), false)
  assert.equal(supplierTrackingShipped(14), false)
})

test('eu address uses a province', () => {
  const hr = supplierDestination({ country: 'HR', city: 'Knin', postal: '22300' })
  assert.equal(hr.countryCode, 'HR')
  assert.equal(hr.country, 'Croatia')
  assert.equal(hr.province, 'Sibenik')
  const de = supplierDestination({ country: 'DE', city: 'Berlin', postal: '10115' })
  assert.equal(de.province, 'Berlin')
  assert.equal(supplierPhone('+385 91 123 4567'), '+385911234567')
})
