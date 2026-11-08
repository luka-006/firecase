import assert from 'node:assert/strict'
import test from 'node:test'
import { parseProposalImageList, withoutProposalImageAt } from './proposal-images.ts'

const a = 'https://example.com/a.jpg'
const b = 'https://example.com/b.jpg'
const c = 'https://example.com/c.jpg'

test('removing one proposal image keeps the other images in order', () => {
  const next = withoutProposalImageAt([a, b, c], 1, 1)
  assert.equal(next.removed, true)
  assert.deepEqual(next.images, [a, c])
  assert.deepEqual(withoutProposalImageAt([a, b], 0, 0).images, [b])
})

test('the last required image stays so a replacement can be added first', () => {
  const kept = withoutProposalImageAt([a], 0, 1)
  assert.equal(kept.removed, false)
  assert.deepEqual(kept.images, [a])
  const empty = parseProposalImageList('[]', 1, 12)
  assert.equal(empty.ok, false)
  if (!empty.ok) assert.match(empty.error, /zadnje slike/)
  const keptList = parseProposalImageList(JSON.stringify([b, a]), 1, 12)
  assert.deepEqual(keptList.ok ? keptList.images : [], [b, a])
})
