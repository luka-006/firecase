import assert from 'node:assert/strict'
import test from 'node:test'
import { staffTokenMatches } from './staff-token.ts'

const env = { STAFF_API_TOKEN: 'grok-token-0123456789abcdef', STAFF_API_TOKEN_CLAUDE: 'claude-token-0123456789abcdef' }

test('both staff tokens are accepted', () => {
  assert.equal(staffTokenMatches('Bearer grok-token-0123456789abcdef', env), true)
  assert.equal(staffTokenMatches('Bearer claude-token-0123456789abcdef', env), true)
  assert.equal(staffTokenMatches('bearer claude-token-0123456789abcdef', env), true)
})

test('wrong, short or missing tokens are refused', () => {
  assert.equal(staffTokenMatches('Bearer claude-token-0123456789abcdeX', env), false)
  assert.equal(staffTokenMatches('Bearer short', env), false)
  assert.equal(staffTokenMatches('claude-token-0123456789abcdef', env), false)
  assert.equal(staffTokenMatches('', env), false)
  assert.equal(staffTokenMatches(null, env), false)
})

test('removing one token keeps the other working', () => {
  const onlyGrok = { STAFF_API_TOKEN: env.STAFF_API_TOKEN }
  assert.equal(staffTokenMatches('Bearer claude-token-0123456789abcdef', onlyGrok), false)
  assert.equal(staffTokenMatches('Bearer grok-token-0123456789abcdef', onlyGrok), true)
  assert.equal(staffTokenMatches('Bearer grok-token-0123456789abcdef', {}), false)
})
