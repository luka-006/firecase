import assert from 'node:assert/strict'
import test from 'node:test'
import {
  alreadyInSolo,
  claimInvoiceSlot,
  isInvoiceYearSeqConflict,
  isOriginalInvoiceConflict,
  parseSoloFiscalSeq,
  placeholderSeq,
  resolveStoredSeq,
} from './invoice/seq.ts'

const yearSeqError = Object.assign(
  new Error('duplicate key value violates unique constraint "invoices_year_seq_key"'),
  { code: '23505', constraint_name: 'invoices_year_seq_key' },
)

test('pending invoices no longer share seq 0, which raised invoices_year_seq_key', () => {
  const legacy = new Set<string>()
  const insertLegacy = (year: number) => {
    const key = `${year}:0`
    if (legacy.has(key)) throw yearSeqError
    legacy.add(key)
  }
  insertLegacy(2026)
  assert.throws(() => insertLegacy(2026), (e) => isInvoiceYearSeqConflict(e))

  const slots = new Map<string, number>()
  const first = claimInvoiceSlot(slots, 2026, 18)
  const second = claimInvoiceSlot(slots, 2026, 19)
  assert.equal(first.seq, -18)
  assert.equal(second.seq, -19)
  assert.notEqual(first.seq, second.seq)
  assert.ok(first.seq < 0 && second.seq < 0)
})

test('claiming the same order again is idempotent and does not take a new number', () => {
  const slots = new Map<string, number>()
  const a = claimInvoiceSlot(slots, 2026, 369609)
  const b = claimInvoiceSlot(slots, 2026, 369609)
  assert.equal(a.idempotent, false)
  assert.equal(b.idempotent, true)
  assert.equal(a.seq, b.seq)
  assert.equal(slots.size, 1)
})

test('placeholder is the negative order id and is never a Solo fiscal sequence', () => {
  assert.equal(placeholderSeq(1), -1)
  assert.equal(placeholderSeq(369609), -369609)
  assert.throws(() => placeholderSeq(0), /pozitivnim/)
  assert.throws(() => placeholderSeq(1.5), /pozitivnim/)
})

test('Solo broj_racuna keeps its own leading sequence', () => {
  assert.equal(parseSoloFiscalSeq('1-1-1'), 1)
  assert.equal(parseSoloFiscalSeq('12-1-1'), 12)
  assert.equal(parseSoloFiscalSeq(' 7-WEB1-1 '), 7)
  assert.equal(parseSoloFiscalSeq('PENDING-4'), null)
  assert.equal(parseSoloFiscalSeq(''), null)
})

test('a free Solo sequence is stored locally so the row matches Solo', () => {
  const decision = resolveStoredSeq(placeholderSeq(42), '4-1-1', new Set([1, 2, 3]))
  assert.deepEqual(decision, { seq: 4, aligned: true })
})

test('a Solo sequence already used by a test row does not block the fiscal number', () => {
  const taken = new Set([0, 1])
  const decision = resolveStoredSeq(placeholderSeq(42), '1-1-1', taken)
  assert.equal(decision.seq, -42)
  assert.equal(decision.aligned, false)
  assert.equal(parseSoloFiscalSeq('1-1-1'), 1)
})

test('fiscal numbers stay the ones Solo issued, not max(local seq)+1', () => {
  const historical = new Set([1])
  const issuedBySolo = ['2-1-1', '3-1-1', '4-1-1']
  const stored = issuedBySolo.map((broj, i) => resolveStoredSeq(placeholderSeq(i + 10), broj, historical))
  assert.deepEqual(
    stored.map((d) => d.seq),
    [2, 3, 4],
  )
  assert.ok(stored.every((d) => d.aligned))
  const bumped = Math.max(...historical) + 1
  assert.notEqual(issuedBySolo[0], `${bumped + 9}-1-1`)
})

test('an invoice Solo already created is not sent again', () => {
  assert.equal(alreadyInSolo({ soloId: null }), false)
  assert.equal(alreadyInSolo({ soloId: '' }), false)
  assert.equal(alreadyInSolo({ soloId: '8791cae3' }), true)
})

test('year/seq conflict is distinguished from the one-invoice-per-order index', () => {
  assert.equal(isInvoiceYearSeqConflict(yearSeqError), true)
  assert.equal(
    isOriginalInvoiceConflict({
      code: '23505',
      message: 'duplicate key value violates unique constraint "invoices_one_original_per_order"',
    }),
    true,
  )
  assert.equal(isInvoiceYearSeqConflict({ code: '23505', constraint_name: 'invoices_number_key' }), false)
  assert.equal(isInvoiceYearSeqConflict({ code: '23502' }), false)
})
