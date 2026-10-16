/**
 * Local bookkeeping for `invoices.seq`.
 *
 * Solo assigns the fiscal number itself (`broj_racuna`, e.g. "12-1-1") and that
 * sequence must stay gapless. We never send a number to Solo and we never
 * invent the next fiscal number with max(seq)+1.
 *
 * The database still has `unique (year, seq)` from the old in-house numbering.
 * Pending rows used to all insert seq = 0, so the second invoice of the year
 * failed with invoices_year_seq_key and no row was stored. A negative
 * placeholder, one per order, cannot collide with Solo's positive sequence or
 * with another order.
 */

export type PgErrorLike = {
  code?: string
  constraint_name?: string
  constraint?: string
  message?: string
}

export function placeholderSeq(orderId: number): number {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error('Račun se veže uz narudžbu s pozitivnim id-em.')
  }
  return -orderId
}

/** Leading integer of Solo's `broj-poslovnica-uredaj` (e.g. "12-1-1" → 12). */
export function parseSoloFiscalSeq(brojRacuna: string): number | null {
  const match = /^(\d+)/.exec(brojRacuna.trim())
  if (!match) return null
  const n = Number(match[1])
  if (!Number.isSafeInteger(n) || n <= 0) return null
  return n
}

function constraintText(e: unknown): string {
  if (!e || typeof e !== 'object') return ''
  const err = e as PgErrorLike
  return `${err.constraint_name ?? ''} ${err.constraint ?? ''} ${err.message ?? ''}`
}

export function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as PgErrorLike).code === '23505'
}

export function isInvoiceYearSeqConflict(e: unknown): boolean {
  return isUniqueViolation(e) && /invoices_year_seq/i.test(constraintText(e))
}

export function isOriginalInvoiceConflict(e: unknown): boolean {
  return isUniqueViolation(e) && /invoices_one_original_per_order/i.test(constraintText(e))
}

export type SeqDecision = {
  /** Value for `invoices.seq`. Negative means "placeholder", not a fiscal number. */
  seq: number
  /** True when `seq` is Solo's own fiscal sequence for this invoice. */
  aligned: boolean
}

/**
 * Mirror Solo's sequence into `seq` only when that (year, seq) slot is free.
 * A historical or test row already using it must not reject the save: the
 * fiscal number is `broj_racuna`, stored in `number` / `solo_number`.
 */
export function resolveStoredSeq(placeholder: number, brojRacuna: string, taken: ReadonlySet<number>): SeqDecision {
  const soloSeq = parseSoloFiscalSeq(brojRacuna)
  if (soloSeq == null || taken.has(soloSeq)) return { seq: placeholder, aligned: false }
  return { seq: soloSeq, aligned: true }
}

/** Solo already created this invoice. A retry must not call the API again. */
export function alreadyInSolo(inv: { soloId: string | null }): boolean {
  return Boolean(inv.soloId)
}

/**
 * In-memory model of the unique (year, seq) insert.
 * Returns the existing order id when the same order is inserted again.
 */
export function claimInvoiceSlot(
  slots: Map<string, number>,
  year: number,
  orderId: number,
): { seq: number; idempotent: boolean } {
  const seq = placeholderSeq(orderId)
  const key = `${year}:${seq}`
  const owner = slots.get(key)
  if (owner === orderId) return { seq, idempotent: true }
  if (owner != null) {
    const err = new Error('duplicate key value violates unique constraint "invoices_year_seq_key"')
    Object.assign(err, { code: '23505', constraint_name: 'invoices_year_seq_key' })
    throw err
  }
  slots.set(key, orderId)
  return { seq, idempotent: false }
}
