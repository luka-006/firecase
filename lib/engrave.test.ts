import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogueEngravers, engravingText, isEngravingCase } from './engrave.ts'
import { href, switchLocale } from './routes.ts'
import { t } from './dict.ts'

test('the Engraver list is active engraving cases, not sets, drafts or ordinary cases', () => {
  const rows = [
    { id: 1, kind: 'product', active: true, engrave: true, nameHr: 'Old name' },
    { id: 2, kind: 'product', active: true, engrave: true, nameHr: 'Renamed case' },
    { id: 3, kind: 'product', active: false, engrave: true, nameHr: 'Hidden' },
    { id: 4, kind: 'set', active: true, engrave: true, nameHr: 'Set' },
    { id: 5, kind: 'product', active: true, engrave: false, nameHr: 'Zephyr' },
    { id: 6, kind: 'product', active: true, nameHr: 'No flag' },
  ]
  assert.equal(isEngravingCase({ ...rows[1], nameHr: 'Something else' }), true)
  assert.deepEqual(catalogueEngravers(rows).map((row) => row.id), [1, 2])
})

test('engraving text allows plain letters and rejects Croatian diacritics', () => {
  assert.deepEqual(engravingText('  Ana  Maria '), { ok: true, text: 'Ana Maria' })
  assert.deepEqual(engravingText(''), { ok: true, text: '' })
  assert.equal(engravingText('Č').ok, false)
  assert.equal(engravingText('ć').ok, false)
  assert.equal(engravingText('Š').ok, false)
  assert.equal(engravingText('ž').ok, false)
  assert.equal(engravingText('Đ').ok, false)
  assert.equal(engravingText('Ana1').ok, false)
  assert.equal(engravingText('Ana-Maria').ok, false)
  assert.equal(engravingText('Ana!').ok, false)
})

test('Engraver links are localized and the public nav includes the tab', () => {
  assert.equal(href('hr', 'engraver'), '/engraver')
  assert.equal(href('en', 'engraver'), '/en/engraver')
  assert.equal(switchLocale('/engraver', 'en'), '/en/engraver')
  assert.equal(switchLocale('/en/engraver', 'hr'), '/engraver')
  assert.equal(t('hr').engraver, 'Engraver')
  assert.equal(t('en').engraver, 'Engraver')
  assert.equal(href('hr', 'shop'), '/trgovina')
  assert.equal(href('en', 'contact'), '/en/contact')
})
