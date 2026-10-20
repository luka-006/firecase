import assert from 'node:assert/strict'
import test from 'node:test'
import { isProposalListBucket, proposalListBucket } from './proposal-bucket.ts'

test('draft and review wait in the pending section', () => {
  assert.equal(proposalListBucket('draft'), 'pending')
  assert.equal(proposalListBucket('review'), 'pending')
  assert.equal(proposalListBucket('accepted'), 'accepted')
  assert.equal(proposalListBucket('rejected'), 'rejected')
  assert.equal(proposalListBucket(''), 'pending')
})

test('only the three admin sections are buckets', () => {
  assert.equal(isProposalListBucket('pending'), true)
  assert.equal(isProposalListBucket('accepted'), true)
  assert.equal(isProposalListBucket('rejected'), true)
  assert.equal(isProposalListBucket('draft'), false)
  assert.equal(isProposalListBucket('review'), false)
})
