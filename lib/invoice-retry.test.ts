import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_COOLDOWN_MS,
  MAX_AUTO_ATTEMPTS,
  SOLO_HOUR_MS,
  SOLO_HOURLY_LIMIT,
  autoRetryDecision,
  backoffMs,
  hourlyRemaining,
  isSoloAuthError,
  isSoloRateLimit,
  pruneHourly,
  retryWaitMs,
} from './invoice/retry-policy.ts'

const MIN = 60 * 1000

test('backoff doubles from 2 minutes and stays capped', () => {
  assert.equal(backoffMs(1), 2 * MIN)
  assert.equal(backoffMs(2), 4 * MIN)
  assert.equal(backoffMs(3), 8 * MIN)
  assert.equal(backoffMs(4), 16 * MIN)
  assert.equal(backoffMs(20), 6 * SOLO_HOUR_MS)
})

test('a fresh invoice is sent immediately', () => {
  assert.deepEqual(autoRetryDecision({ now: 1_000, attempts: 0, lastAttemptAt: null, fiscalError: null }), { allow: true })
})

test('automatic retries wait out the exponential delay', () => {
  const last = 1_000_000
  const blocked = autoRetryDecision({ now: last + 2 * MIN - 1, attempts: 1, lastAttemptAt: last, fiscalError: 'Solo API greška (100)' })
  assert.equal(blocked.allow, false)
  assert.equal(blocked.reason, 'backoff')
  const due = autoRetryDecision({ now: last + 2 * MIN, attempts: 1, lastAttemptAt: last, fiscalError: 'Solo API greška (100)' })
  assert.equal(due.allow, true)
})

test('after the attempt cap only a manual retry is allowed', () => {
  const last = 5_000
  const auto = autoRetryDecision({
    now: last + 24 * SOLO_HOUR_MS,
    attempts: MAX_AUTO_ATTEMPTS,
    lastAttemptAt: last,
    fiscalError: 'timeout',
  })
  assert.equal(auto.allow, false)
  assert.equal(auto.reason, 'max_attempts')
  const manual = autoRetryDecision({
    now: last + 1,
    attempts: MAX_AUTO_ATTEMPTS + 3,
    lastAttemptAt: last,
    fiscalError: 'timeout',
    manual: true,
  })
  assert.equal(manual.allow, true)
})

test('Neispravan token and status 101 are auth errors and retry at most once an hour', () => {
  assert.equal(isSoloAuthError('Neispravan token'), true)
  assert.equal(isSoloAuthError('nesto drugo', 101), true)
  assert.equal(isSoloAuthError('timeout', 100), false)
  assert.equal(retryWaitMs(1, 'Neispravan token'), AUTH_COOLDOWN_MS)

  const last = 10_000_000
  const soon = autoRetryDecision({ now: last + AUTH_COOLDOWN_MS - 1, attempts: 1, lastAttemptAt: last, fiscalError: 'Neispravan token' })
  assert.equal(soon.allow, false)
  assert.equal(soon.reason, 'auth_cooldown')
  const later = autoRetryDecision({ now: last + AUTH_COOLDOWN_MS, attempts: 1, lastAttemptAt: last, fiscalError: 'Neispravan token (101)' })
  assert.equal(later.allow, true)
})

test('429 is a rate limit and waits at least 15 minutes', () => {
  assert.equal(isSoloRateLimit('Solo 429: previše zahtjeva', 429, 429), true)
  assert.equal(isSoloRateLimit('too many requests'), true)
  assert.equal(isSoloRateLimit('Neispravan token'), false)
  assert.ok(retryWaitMs(1, 'Solo 429') >= 15 * MIN)
})

test('hourly window keeps the shop under Solo’s 100 requests / 60 min', () => {
  const now = 10_000_000
  const recent = Array.from({ length: SOLO_HOURLY_LIMIT }, (_, i) => now - i * 1000)
  const old = now - SOLO_HOUR_MS - 1
  assert.equal(hourlyRemaining(recent, now), 0)
  assert.equal(hourlyRemaining([...recent.slice(0, 3), old], now), SOLO_HOURLY_LIMIT - 3)
  assert.equal(pruneHourly([old, now - 1, now + 5_000], now).length, 1)
  assert.ok(SOLO_HOURLY_LIMIT <= 40)
  assert.ok(SOLO_HOURLY_LIMIT < 100)
})
