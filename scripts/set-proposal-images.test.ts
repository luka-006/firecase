import assert from 'node:assert/strict'
import test from 'node:test'
import { handleSetImageReplace } from '../lib/set-proposal-image-http.ts'
import { setProposalImagesSchema } from '../lib/staff/set-proposal-schema.ts'
import type { SetProposal } from '../lib/set-proposals.ts'

const image = 'https://example.com/set-trio.jpg'

function proposal(images: string[], status: SetProposal['status'] = 'review'): SetProposal {
  return {
    id: 4,
    status,
    nameHr: 'Set Trio',
    shortHr: 'Tri futrole.',
    images,
    items: [{ productId: 1, slug: 'zephyr' }],
    priceCents: 3990,
    freeShipping: true,
    sizeMix: '2× J6, 1× J5',
    notes: '',
    rejectReason: null,
    productId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

test('image replacement accepts only an id and http(s) image urls', () => {
  assert.equal(setProposalImagesSchema.safeParse({ id: 4, images: [image, 'https://example.com/j5.jpg'] }).success, true)
  assert.equal(setProposalImagesSchema.safeParse({ id: 4, images: [] }).success, false)
  assert.equal(setProposalImagesSchema.safeParse({ id: 4, images: ['/local.jpg'] }).success, false)
  assert.equal(setProposalImagesSchema.safeParse({ id: 0, images: [image] }).success, false)
  assert.equal(setProposalImagesSchema.safeParse({ id: 1.5, images: [image] }).success, false)
  assert.equal(setProposalImagesSchema.safeParse({ id: 4 }).success, false)
  const extra = setProposalImagesSchema.safeParse({ id: 4, images: [image], priceCents: 100, status: 'accepted', freeShipping: false })
  assert.equal(extra.success, false)
})

test('replacing images requires the staff token and a valid body', async () => {
  let calls = 0
  const replace = async () => {
    calls += 1
    return { ok: true as const, proposal: proposal([image]) }
  }
  const missing = await handleSetImageReplace({ authorized: false, body: { id: 4, images: [image] }, replace })
  assert.equal(missing.status, 401)
  assert.equal(calls, 0)
  const junk = await handleSetImageReplace({ authorized: true, jsonError: true, body: undefined, replace })
  assert.equal(junk.status, 400)
  const bad = await handleSetImageReplace({ authorized: true, body: { id: 4, images: [image], name: 'Set Trio' }, replace })
  assert.equal(bad.status, 400)
  const empty = await handleSetImageReplace({ authorized: true, body: { id: 4, images: [] }, replace })
  assert.equal(empty.status, 400)
  assert.equal(calls, 0)

  const gone = await handleSetImageReplace({
    authorized: true,
    body: { id: 99, images: [image] },
    replace: async () => ({ ok: false as const, error: 'not_found' as const }),
  })
  assert.equal(gone.status, 404)
  const closed = await handleSetImageReplace({
    authorized: true,
    body: { id: 4, images: [image] },
    replace: async () => ({ ok: false as const, error: 'not_pending' as const }),
  })
  assert.equal(closed.status, 409)

  const next = ['https://example.com/set-trio-v4.jpg']
  let presented = false
  const ok = await handleSetImageReplace({
    authorized: true,
    body: { id: 4, images: next },
    replace: async (id, images) => {
      assert.equal(id, 4)
      assert.deepEqual(images, next)
      return { ok: true as const, proposal: proposal(images) }
    },
    present: async (row) => {
      presented = true
      assert.equal(row.nameHr, 'Set Trio')
      assert.equal(row.priceCents, 3990)
      assert.equal(row.freeShipping, true)
      assert.equal(row.status, 'review')
      return { ...row, resolved: [], separateCents: null, savingsCents: null, costCents: null, marginCents: null, complete: false }
    },
  })
  assert.equal(ok.status, 200)
  assert.equal(presented, true)
  const payload = await ok.json() as { proposal: { images: string[]; nameHr: string; status: string } }
  assert.deepEqual(payload.proposal.images, next)
  assert.equal(payload.proposal.nameHr, 'Set Trio')
  assert.equal(payload.proposal.status, 'review')
})

const hasDb = Boolean(process.env.DATABASE_URL)

test('pending proposals replace images only; closed ones and missing ids do not', { skip: hasDb ? false : 'DATABASE_URL unset' }, async () => {
  const { sql } = await import('../lib/db.ts')
  const { replacePendingSetProposalImages } = await import('../lib/set-proposals.ts')
  const ids: number[] = []
  const productIds: number[] = []

  async function proposal(status: string, productId: number | null, images: string[]) {
    const [row] = await sql<{ id: number }[]>`
      insert into set_proposals (
        status, name_hr, short_hr, images, items, price_cents, free_shipping, size_mix, notes, product_id
      ) values (
        ${status},
        'image-replace-test',
        'Kratki opis ostaje.',
        ${sql.json(images)},
        ${sql.json([{ productId: 1, slug: 'zephyr' }])},
        3990,
        true,
        '2× J6, 1× J5',
        'bilješka',
        ${productId}
      ) returning id`
    ids.push(row.id)
    return row.id
  }

  try {
    const [product] = await sql<{ id: number; images: string[]; updatedAt: Date }[]>`
      insert into products (slug, name_hr, price_cents, images, active, kind)
      values (${`image-replace-${Date.now()}`}, 'Ne diraj', 1000, ${sql.json(['https://example.com/original-product.jpg'])}, false, 'set')
      returning id, images, updated_at`
    productIds.push(product.id)

    const reviewId = await proposal('review', null, ['https://example.com/old-review.jpg'])
    const draftId = await proposal('draft', product.id, ['https://example.com/old-draft.jpg'])
    const acceptedId = await proposal('accepted', product.id, ['https://example.com/old-accepted.jpg'])
    const rejectedId = await proposal('rejected', null, ['https://example.com/old-rejected.jpg'])

    const missing = await replacePendingSetProposalImages(2_000_000_000, ['https://example.com/new.jpg'])
    assert.equal(missing.ok, false)
    if (!missing.ok) assert.equal(missing.error, 'not_found')

    const accepted = await replacePendingSetProposalImages(acceptedId, ['https://example.com/new-accepted.jpg'])
    assert.equal(accepted.ok, false)
    if (!accepted.ok) assert.equal(accepted.error, 'not_pending')
    const rejected = await replacePendingSetProposalImages(rejectedId, ['https://example.com/new-rejected.jpg'])
    assert.equal(rejected.ok, false)
    if (!rejected.ok) assert.equal(rejected.error, 'not_pending')

    const next = ['https://example.com/set-trio-v4.jpg', 'https://example.com/set-trio-j5-v4.jpg']
    const review = await replacePendingSetProposalImages(reviewId, next)
    assert.equal(review.ok, true)
    if (review.ok) {
      assert.deepEqual(review.proposal.images, next)
      assert.equal(review.proposal.status, 'review')
      assert.equal(review.proposal.nameHr, 'image-replace-test')
      assert.equal(review.proposal.shortHr, 'Kratki opis ostaje.')
      assert.equal(review.proposal.priceCents, 3990)
      assert.equal(review.proposal.freeShipping, true)
      assert.equal(review.proposal.sizeMix, '2× J6, 1× J5')
      assert.equal(review.proposal.notes, 'bilješka')
      assert.equal(review.proposal.productId, null)
    }

    const draft = await replacePendingSetProposalImages(draftId, ['https://example.com/set-penta-v4.jpg'])
    assert.equal(draft.ok, true)
    if (draft.ok) {
      assert.deepEqual(draft.proposal.images, ['https://example.com/set-penta-v4.jpg'])
      assert.equal(draft.proposal.status, 'draft')
      assert.equal(draft.proposal.productId, product.id)
    }

    const [storedReview] = await sql<{ status: string; nameHr: string; priceCents: number; freeShipping: boolean; images: string[]; items: { slug: string }[] }[]>`
      select status, name_hr, price_cents, free_shipping, images, items from set_proposals where id = ${reviewId}`
    assert.equal(storedReview.status, 'review')
    assert.equal(storedReview.nameHr, 'image-replace-test')
    assert.equal(storedReview.priceCents, 3990)
    assert.equal(storedReview.freeShipping, true)
    assert.deepEqual(storedReview.images, next)
    assert.equal(storedReview.items[0]?.slug, 'zephyr')

    const [storedAccepted] = await sql<{ images: string[] }[]>`select images from set_proposals where id = ${acceptedId}`
    assert.deepEqual(storedAccepted.images, ['https://example.com/old-accepted.jpg'])
    const [storedProduct] = await sql<{ images: string[] }[]>`select images from products where id = ${product.id}`
    assert.deepEqual(storedProduct.images, ['https://example.com/original-product.jpg'])
  } finally {
    if (ids.length) await sql`delete from set_proposals where id in ${sql(ids)}`
    if (productIds.length) await sql`delete from products where id in ${sql(productIds)}`
  }
})
