import { test } from 'node:test'
import assert from 'node:assert/strict'
import { t } from './dict.ts'
import { BUILD_SET_TIERS, nextBuiltSetTier } from './set-builder.ts'

test('set tiers read as discount, free shipping, bigger discount', () => {
  assert.equal(t('hr').buildTiers(BUILD_SET_TIERS), 'Za 3 futrole 10% popusta, za 5 i više besplatna dostava, za 8 i više 30%.')
  assert.equal(t('en').buildTiers(BUILD_SET_TIERS), '3 cases get 10% off, 5 or more ship free, 8 or more get 30%.')
})

test('the next step names free shipping when that is what it adds', () => {
  const hr = t('hr')
  const en = t('en')
  const at3 = nextBuiltSetTier(3)!
  assert.equal(hr.buildNext(at3.need, at3.percent, at3.freeShipping), 'Još 2 futrole do besplatne dostave')
  assert.equal(en.buildNext(at3.need, at3.percent, at3.freeShipping), '2 more cases to free shipping')
  const at5 = nextBuiltSetTier(5)!
  assert.equal(hr.buildNext(at5.need, at5.percent, at5.freeShipping), 'Još 3 futrole do 30% popusta')
})

test('the free-shipping answer names the set size when there is one', () => {
  assert.deepEqual(t('hr').freeShipFaq('40 €', 5), ['Kada je dostava besplatna?', 'Za set od 5 ili više futrola i za narudžbe od 40 €, računa se prije popusta.'])
  assert.deepEqual(t('hr').freeShipFaq('40 €'), ['Kada je dostava besplatna?', 'Za narudžbe od 40 €, računa se prije popusta.'])
})
