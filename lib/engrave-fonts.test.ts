import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_ENGRAVE_FONT, ENGRAVE_FONTS, engraveFont, engraveFontLabel, engraveMetal } from './engrave-fonts.ts'

test('engraving fonts are numbered 1-12 without gaps, so they match the supplier list', () => {
  assert.deepEqual(ENGRAVE_FONTS.map((f) => f.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.equal(engraveFont(DEFAULT_ENGRAVE_FONT)?.id, 1)
})

test('unknown font ids are not accepted', () => {
  assert.equal(engraveFont(0), undefined)
  assert.equal(engraveFont(13), undefined)
  assert.equal(engraveFont('3'), undefined)
  assert.equal(engraveFontLabel(99), '')
  assert.equal(engraveFontLabel(3), 'Font 3 (Arimo Bold)')
})

test('the preview metal follows the colour option', () => {
  assert.equal(engraveMetal({ hr: 'Zlatna', en: 'Gold' }), 'gold')
  assert.equal(engraveMetal({ hr: 'Srebrna', en: 'Silver' }), 'silver')
  assert.equal(engraveMetal(undefined), 'gold')
})
