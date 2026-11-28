import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VISIBILITY_BATCH_MAX, planVisibilityChanges } from './staff-visibility.ts'

const rows = [
  { id: 1, slug: 'tiger', active: true },
  { id: 2, slug: 'mercor', active: true },
  { id: 3, slug: 'set-trio', active: false },
]

test('hiding lists only products that change, with the old state for undo', () => {
  const plan = planVisibilityChanges(rows, [
    { slug: 'mercor', active: false },
    { slug: 'set-trio', active: false },
  ])
  assert.deepEqual(plan, { ok: true, changes: [{ id: 2, slug: 'mercor', from: true, to: false }] })
})

test('showing a hidden product again works the same way', () => {
  const plan = planVisibilityChanges(rows, [{ slug: 'set-trio', active: true }])
  assert.deepEqual(plan, { ok: true, changes: [{ id: 3, slug: 'set-trio', from: false, to: true }] })
})

test('unknown, repeated or empty lists are refused and nothing is planned', () => {
  assert.deepEqual(planVisibilityChanges(rows, []), { ok: false, error: 'No products sent' })
  const unknown = planVisibilityChanges(rows, [{ slug: 'tiger', active: false }, { slug: 'nope', active: false }])
  assert.equal(unknown.ok, false)
  assert.deepEqual(!unknown.ok && unknown.slugs, ['nope'])
  const twice = planVisibilityChanges(rows, [{ slug: 'tiger', active: false }, { slug: 'tiger', active: true }])
  assert.equal(twice.ok, false)
  assert.deepEqual(!twice.ok && twice.slugs, ['tiger'])
  const many = Array.from({ length: VISIBILITY_BATCH_MAX + 1 }, (_, i) => ({ slug: `p${i}`, active: false }))
  assert.equal(planVisibilityChanges(rows, many).ok, false)
})
