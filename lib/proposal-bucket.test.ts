import assert from 'node:assert/strict'
import test from 'node:test'
import { isDeletableProposalStatus, isProposalListBucket, parseProposalId, proposalListBucket } from './proposal-bucket.ts'

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

test('only draft and review proposals can be deleted', () => {
  assert.equal(isDeletableProposalStatus('draft'), true)
  assert.equal(isDeletableProposalStatus('review'), true)
  assert.equal(isDeletableProposalStatus('accepted'), false)
  assert.equal(isDeletableProposalStatus('rejected'), false)
  assert.equal(isDeletableProposalStatus('pending'), false)
  assert.equal(isDeletableProposalStatus(''), false)
})

test('proposal id query values are positive int4', () => {
  assert.equal(parseProposalId('12'), 12)
  assert.equal(parseProposalId('2147483647'), 2147483647)
  assert.equal(parseProposalId(null), null)
  assert.equal(parseProposalId(''), null)
  assert.equal(parseProposalId('0'), null)
  assert.equal(parseProposalId('-3'), null)
  assert.equal(parseProposalId('1.5'), null)
  assert.equal(parseProposalId('1e2'), null)
  assert.equal(parseProposalId(' 4'), null)
  assert.equal(parseProposalId('2147483648'), null)
})
