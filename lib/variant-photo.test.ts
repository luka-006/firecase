import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanVariant, keepVariantImages, photoForVariant, publicVariants, variantImage } from './variants.ts'

const imgs = ['https://x.public.blob.vercel-storage.com/a.png', 'https://x.public.blob.vercel-storage.com/b.png']

test('a colour keeps its photo through admin save and the public view', () => {
  const v = cleanVariant({ hr: 'Zlatna', en: 'Gold', image: imgs[1], sup: 'gold' })
  assert.equal(v?.image, imgs[1])
  assert.deepEqual(publicVariants([v!]), [{ hr: 'Zlatna', en: 'Gold', image: imgs[1] }])
})

test('only site paths and https links are kept as colour photos', () => {
  assert.equal(variantImage('javascript:alert(1)'), '')
  assert.equal(variantImage('http://x/a.png'), '')
  assert.equal(variantImage(' /products/a.png '), '/products/a.png')
  assert.equal(variantImage(42), '')
})

test('a photo removed from the product is dropped from its colour', () => {
  const out = keepVariantImages([{ hr: 'A', en: 'A', image: imgs[0] }, { hr: 'B', en: 'B', image: 'https://gone.example/c.png' }], imgs)
  assert.equal(out[0].image, imgs[0])
  assert.equal('image' in out[1], false)
})

test('the picked colour shows its own photo, otherwise the first photo', () => {
  const p = { images: imgs, variants: [{ hr: 'A', en: 'A' }, { hr: 'B', en: 'B', image: imgs[1] }] }
  assert.equal(photoForVariant(p, 1), imgs[1])
  assert.equal(photoForVariant(p, 0), imgs[0])
  assert.equal(photoForVariant(p, -1), imgs[0])
  assert.equal(photoForVariant({ image: '/one.png', variants: [] }, -1), '/one.png')
})
