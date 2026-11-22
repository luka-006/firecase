import assert from 'node:assert/strict'
import test from 'node:test'
import { buckydropSign, buckydropSignOk } from './buckydrop-sign.ts'

test('signature matches the worked example in the BuckyDrop OpenAPI docs', () => {
  const body = '{"current":1,"size":1,"item":{"countryCode":"US","weight":"200"}}'
  assert.equal(
    buckydropSign('9691a3516910a48579d45debb74b09af', body, '1652263332000', 'f2bb8cfc5e55c28da9b3d6d4614d205f'),
    '98603052d52af00696c9dfacf45fdf2f',
  )
})

test('webhook check accepts the right sign and rejects a changed body or missing parts', () => {
  const body = '{"notifyType":18,"notifyBody":{}}'
  const sign = buckydropSign('code', body, '1700000000000', 'secret')
  assert.equal(buckydropSignOk('code', body, '1700000000000', sign, 'secret'), true)
  assert.equal(buckydropSignOk('code', body, '1700000000000', sign.toUpperCase(), 'secret'), true)
  assert.equal(buckydropSignOk('code', body + ' ', '1700000000000', sign, 'secret'), false)
  assert.equal(buckydropSignOk('code', body, '1700000000000', sign, ''), false)
})
