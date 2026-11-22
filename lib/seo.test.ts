import assert from 'node:assert/strict'
import test from 'node:test'
import { lighterModels, listingMeta, productMetaDescription, productSeoTitle, siteDescription } from './seo.ts'
import { t } from './dict.ts'
import { money, euros } from './money.ts'
import type { Locale } from './routes.ts'

test('lighterModels finds each model once, in reading order', () => {
  assert.deepEqual(lighterModels(['BIC J6 (standardni)', 'bic j5 mini', 'BIC J6']), ['BIC J6', 'BIC J5'])
  assert.deepEqual(lighterModels(['Zrcalo za Cricket', '']), ['Cricket'])
  assert.deepEqual(lighterModels(['Za Zippo i Zorro upaljače', 'Clipper CP11']), ['Zippo', 'Clipper'])
  assert.deepEqual(lighterModels(['Metalna futrola']), [])
})

test('product titles name the lighter model and keep the main keyword', () => {
  assert.equal(productSeoTitle('Engraver', ['BIC J6'], 'hr'), 'Engraver – futrola za upaljač BIC J6')
  assert.equal(productSeoTitle('Engraver', ['BIC J6'], 'en'), 'Engraver – lighter case for BIC J6')
  assert.equal(productSeoTitle('Baroque', ['BIC J6', 'BIC J5', 'Zippo'], 'hr'), 'Baroque – futrola za upaljač BIC J6 / BIC J5')
  assert.equal(productSeoTitle('Set Trio', [], 'hr'), 'Set Trio – futrola za upaljač')
})

test('the product meta description keeps the fit line when the text is long', () => {
  const text = productMetaDescription({
    locale: 'hr',
    name: 'Virtuoso',
    short: 'Brušeni metal s cvjetnom gravurom koja se vidi pri svakom paljenju upaljača',
    material: 'Brušeni metal, cinkova legura, ručno polirana završna obrada',
    variants: [{ hr: 'BIC J5', en: 'BIC J5' }],
  })
  assert.match(text, /Za BIC J5\./)
  assert.ok(text.length <= 160, `${text.length} > 160`)
})

test('listing and site descriptions stay within the 160-character snippet limit', () => {
  for (const l of ['hr', 'en'] as const) {
    for (const page of ['shop', 'sets', 'engraver', 'build'] as const) {
      const m = listingMeta(page, l)
      assert.ok(m.description.length <= 160, `${page}/${l}: ${m.description.length}`)
      assert.ok(m.description.length >= 110, `${page}/${l} too short: ${m.description.length}`)
    }
    assert.ok(siteDescription(l, '40 €').length <= 160)
  }
})

test('an unknown locale falls back to Croatian instead of crashing', () => {
  const junk = 'index.php' as Locale
  assert.equal(t(junk), t('hr'))
  assert.equal(money(1999, junk), money(1999, 'hr'))
  assert.equal(euros(4000, junk), euros(4000, 'hr'))
})

test('the hero has no smoking wording', () => {
  for (const l of ['hr', 'en'] as const) {
    const d = t(l)
    const hero = `${d.heroEyebrow} ${d.heroPre} ${d.heroEm} ${d.heroPost} ${d.heroSub}`.toLowerCase()
    for (const word of ['cigaret', 'pušen', 'duhan', 'smoke', 'cigarette', 'tobacco']) assert.ok(!hero.includes(word), `${l}: ${word}`)
  }
})
