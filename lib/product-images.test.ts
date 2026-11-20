import assert from 'node:assert/strict'
import test from 'node:test'
import { isShopImageUrl, productImagesSchema } from './product-images.ts'

const blob = 'https://fzkdxcbx7juw2kkp.public.blob.vercel-storage.com/proposals/a-1.jpg'

test('only https photos from the shop Blob store are allowed', () => {
  assert.equal(isShopImageUrl(blob), true)
  assert.equal(isShopImageUrl('http://fzkdxcbx7juw2kkp.public.blob.vercel-storage.com/a.jpg'), false)
  assert.equal(isShopImageUrl('https://example.com/a.jpg'), false)
  assert.equal(isShopImageUrl('https://public.blob.vercel-storage.com.evil.com/a.jpg'), false)
  assert.equal(isShopImageUrl('not a url'), false)
})

test('the body may only carry a slug and a non-empty photo list', () => {
  assert.equal(productImagesSchema.safeParse({ slug: 'engraver', images: [blob] }).success, true)
  assert.equal(productImagesSchema.safeParse({ slug: 'engraver', images: [] }).success, false)
  assert.equal(productImagesSchema.safeParse({ slug: '', images: [blob] }).success, false)
  assert.equal(productImagesSchema.safeParse({ slug: 'engraver', images: [blob], priceCents: 1 }).success, false)
  assert.equal(productImagesSchema.safeParse({ slug: 'engraver', images: ['https://example.com/a.jpg'] }).success, false)
})
