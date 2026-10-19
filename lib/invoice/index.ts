import 'server-only'
import type postgres from 'postgres'
import { sql } from '../db'
import { SELLER } from '../config'
import { zagrebParts } from '../money'
import { createSoloInvoice, fetchSoloPdf, stornoSoloInvoice, type SoloCreateResult } from './solo'
import { sleep, soloHourlyRemaining, withSoloApiSlot } from './solo-queue'
import { MAX_AUTO_ATTEMPTS, SoloHourlyLimit, autoRetryDecision } from './retry-policy'
import { alreadyInSolo, isUniqueViolation, parseSoloFiscalSeq, placeholderSeq, resolveStoredSeq } from './seq'
import type { Invoice, InvoiceData, Order } from '../types'

/** Per-order lock so two workers cannot insert or send the same order twice. */
function lockOrder(tx: postgres.TransactionSql, orderId: number) {
  return tx`select pg_advisory_xact_lock(733104, ${orderId}::int)`
}

export function paymentCodeFor(method: string | null) {
  if (!method) return 'K'
  return /paypal/i.test(method) ? 'O' : 'K'
}

function invoiceDataFromOrder(order: Order, storno?: Invoice): InvoiceData {
  const items = storno
    ? storno.data.items.map((i) => ({ ...i, unitCents: -i.unitCents, totalCents: -i.totalCents }))
    : order.items.map((i) => ({
        name: i.name,
        variant: i.variant || undefined,
        qty: i.qty,
        unitCents: i.unitCents,
        totalCents: i.unitCents * i.qty,
      }))
  const shippingCents = storno ? -storno.data.shippingCents : order.shippingCents
  const discountCents = storno ? -(storno.data.discountCents || 0) : order.discountCents || 0
  const upsellDiscountCents = storno ? -(storno.data.upsellDiscountCents || 0) : order.upsellDiscountCents || 0
  const promoDiscountCents = storno ? -(storno.data.promoDiscountCents || 0) : order.promoDiscountCents || 0
  const promoCode = storno ? storno.data.promoCode : order.promoCode || ''
  const totalCents = storno ? -storno.totalCents : order.totalCents
  return {
    seller: { legalName: SELLER.legalName, address: SELLER.address, postal: SELLER.postal, city: SELLER.city, oib: SELLER.oib, email: SELLER.email },
    buyer: { name: order.name, email: order.email, address: order.address, postal: order.postal, city: order.city, country: order.country },
    items,
    shippingCents,
    discountCents,
    upsellDiscountCents,
    promoDiscountCents,
    promoCode: promoCode || undefined,
    totalCents,
    paymentLabel: order.paymentMethod || 'Kartica',
    orderPublicId: order.publicId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    operatorOib: SELLER.oib,
    premises: 'WEB1',
    device: '1',
    seqMode: 'P',
    locale: order.locale,
    stornoOfNumber: storno?.number,
  }
}

async function insertPendingInvoice(tx: postgres.TransactionSql, order: Order, data: InvoiceData): Promise<Invoice> {
  const issuedAt = new Date()
  const year = Number(zagrebParts(issuedAt).year)
  const paymentCode = paymentCodeFor(order.paymentMethod)
  const seq = placeholderSeq(order.id)
  const [row] = await tx<Invoice[]>`insert into invoices ${tx({
    orderId: order.id,
    year,
    seq,
    number: `PENDING-${order.id}`,
    issuedAt,
    totalCents: order.totalCents,
    paymentCode,
    stornoOf: null,
    fiscalStatus: 'pending',
    data: tx.json(data as never),
  })} returning *`
  return row
}

async function takenSeqs(tx: postgres.TransactionSql, year: number, exceptId: number): Promise<Set<number>> {
  const rows = await tx<{ seq: number }[]>`select seq from invoices where year = ${year} and id <> ${exceptId}`
  return new Set(rows.map((r) => r.seq))
}

async function persistSoloResult(tx: postgres.TransactionSql, fresh: Invoice, solo: SoloCreateResult): Promise<Invoice> {
  const placeholder = fresh.seq < 0 ? fresh.seq : placeholderSeq(fresh.orderId)
  const taken = await takenSeqs(tx, fresh.year, fresh.id)
  const decision = resolveStoredSeq(placeholder, solo.brojRacuna, taken)
  const [numClash] = await tx<{ id: number }[]>`
    select id from invoices where number = ${solo.brojRacuna} and id <> ${fresh.id} limit 1`
  const number = numClash ? fresh.number : solo.brojRacuna

  const write = (sp: postgres.TransactionSql, seq: number, nextNumber: string) =>
    sp<Invoice[]>`update invoices set
      solo_id = ${solo.id},
      solo_number = ${solo.brojRacuna},
      solo_pdf_url = ${solo.pdf || null},
      number = ${nextNumber},
      seq = ${seq},
      jir = ${solo.jir || null},
      zki = ${solo.zki || null},
      fiscal_status = 'ok',
      fiscal_error = null,
      fiscal_attempts = fiscal_attempts + 1,
      issued_at = now()
      where id = ${fresh.id} returning *`

  try {
    const [row] = await tx.savepoint((sp) => write(sp, decision.seq, number))
    return row
  } catch (e) {
    if (!isUniqueViolation(e)) throw e
    console.error('[solo] seq zauzet, fiskalni broj ostaje u solo_number', fresh.orderId, solo.brojRacuna, parseSoloFiscalSeq(solo.brojRacuna))
    const [row] = await tx<Invoice[]>`update invoices set
      solo_id = ${solo.id},
      solo_number = ${solo.brojRacuna},
      solo_pdf_url = ${solo.pdf || null},
      seq = ${placeholder},
      jir = ${solo.jir || null},
      zki = ${solo.zki || null},
      fiscal_status = 'ok',
      fiscal_error = null,
      fiscal_attempts = fiscal_attempts + 1,
      issued_at = now()
      where id = ${fresh.id} returning *`
    if (!numClash) {
      try {
        const [renamed] = await tx.savepoint((sp) => sp<Invoice[]>`
          update invoices set number = ${solo.brojRacuna} where id = ${fresh.id} returning *`)
        return renamed
      } catch (err) {
        if (!isUniqueViolation(err)) throw err
      }
    }
    return row
  }
}

function retryDecision(inv: Invoice, manual?: boolean) {
  return autoRetryDecision({
    now: Date.now(),
    attempts: inv.fiscalAttempts || 0,
    lastAttemptAt: inv.lastAttemptAt ? new Date(inv.lastAttemptAt).getTime() : null,
    fiscalError: inv.fiscalError,
    manual,
  })
}

async function submitToSolo(order: Order, inv: Invoice, opts?: { manual?: boolean }): Promise<Invoice> {
  if (alreadyInSolo(inv) && inv.fiscalStatus === 'ok') return inv
  if (!retryDecision(inv, opts?.manual).allow) return inv
  if (!opts?.manual && (await soloHourlyRemaining()) <= 0) return inv
  return withSoloApiSlot(async (tx, noteRequest) => {
    await lockOrder(tx, order.id)
    const [locked] = await tx<Invoice[]>`select * from invoices where id = ${inv.id} for update`
    if (!locked) throw new Error('Račun nije pronađen.')
    let fresh = locked
    if (fresh.seq === 0 && !fresh.soloId) {
      const seq = placeholderSeq(fresh.orderId)
      try {
        const [moved] = await tx.savepoint((sp) => sp<Invoice[]>`
          update invoices set seq = ${seq} where id = ${fresh.id} and seq = 0 returning *`)
        if (moved) fresh = moved
      } catch (e) {
        if (!isUniqueViolation(e)) throw e
      }
    }
    if (!retryDecision(fresh, opts?.manual).allow) return fresh
    if (alreadyInSolo(fresh)) {
      if (fresh.fiscalStatus === 'ok') return fresh
      const [row] = await tx<Invoice[]>`update invoices set fiscal_status = 'ok', fiscal_error = null where id = ${fresh.id} returning *`
      return row
    }
    let solo: SoloCreateResult
    try {
      solo = await createSoloInvoice(order, fresh.data, noteRequest)
    } catch (e) {
      if (e instanceof SoloHourlyLimit) {
        console.warn('[solo] satni limit', order.id)
        return fresh
      }
      const msg = (e as Error).message.slice(0, 500)
      console.error('[solo]', order.id, msg)
      const [row] = await tx<Invoice[]>`update invoices set
        fiscal_status = case when fiscal_attempts + 1 >= ${MAX_AUTO_ATTEMPTS} then 'error' else 'pending' end,
        fiscal_error = ${msg},
        fiscal_attempts = fiscal_attempts + 1,
        last_attempt_at = now()
        where id = ${fresh.id} returning *`
      return row
    }
    console.info('[solo] izdan', order.orderNumber, solo.id, solo.brojRacuna)
    return persistSoloResult(tx, fresh, solo)
  })
}

/** Idempotentno izdavanje originalnog računa preko Soloa (jedan po narudžbi). */
export async function ensureOrderInvoice(order: Order): Promise<Invoice> {
  const inv = await sql.begin(async (tx) => {
    await lockOrder(tx, order.id)
    const existing = await tx<Invoice[]>`select * from invoices where order_id = ${order.id} and storno_of is null order by id desc limit 1`
    if (existing[0]) return existing[0]
    return insertPendingInvoice(tx, order, invoiceDataFromOrder(order))
  })
  if (alreadyInSolo(inv) && inv.fiscalStatus === 'ok') return inv
  return submitToSolo(order, inv)
}

export async function retryIssueInvoice(invoiceId: number, opts?: { manual?: boolean }): Promise<Invoice | null> {
  const [inv] = await sql<Invoice[]>`select * from invoices where id = ${invoiceId}`
  if (!inv || inv.stornoOf) return null
  const [order] = await sql<Order[]>`select * from orders where id = ${inv.orderId}`
  if (!order) return null
  return submitToSolo(order, inv, opts)
}

export async function issueInvoice(order: Order, storno?: Invoice): Promise<Invoice> {
  if (!storno) return ensureOrderInvoice(order)
  throw new Error('Storno računa ide preko Soloa (API storno), ne kroz issueInvoice.')
}

export async function stornoOrderInvoice(order: Order): Promise<{ ok: boolean; error?: string; manual?: boolean }> {
  const [original] = await sql<Invoice[]>`select * from invoices where order_id = ${order.id} and storno_of is null order by id limit 1`
  if (!original?.soloId) {
    return { ok: false, manual: true, error: 'Nema Solo računa — storno napravite ručno u Soloa.' }
  }
  if (original.soloStornoAt) return { ok: true }
  try {
    await withSoloApiSlot((_tx, noteRequest) => stornoSoloInvoice(original.soloId!, noteRequest))
    await sql`update invoices set solo_storno_at = now(), fiscal_error = null where id = ${original.id}`
    return { ok: true }
  } catch (e) {
    const msg = (e as Error).message
    await sql`update invoices set fiscal_error = ${`Storno: ${msg}`.slice(0, 500)} where id = ${original.id}`
    return { ok: false, error: msg, manual: true }
  }
}

export async function getInvoicePdfBytes(inv: Invoice): Promise<Uint8Array> {
  if (inv.soloPdfUrl) return fetchSoloPdf(inv.soloPdfUrl)
  throw new Error('PDF računa nije dostupan (Solo link nedostaje).')
}

export async function waitForOrderInvoice(order: Order, maxWaitMs = 45_000): Promise<Invoice | null> {
  const deadline = Date.now() + maxWaitMs
  let inv: Invoice | null = null
  while (Date.now() < deadline) {
    inv = await ensureOrderInvoice(order)
    if (inv.fiscalStatus === 'ok' && inv.soloPdfUrl) return inv
    if (inv.fiscalStatus === 'ok') return inv
    await sleep(Math.min(3000, deadline - Date.now()))
  }
  return inv
}

export async function getInvoicesForOrder(orderId: number) {
  return [...(await sql<Invoice[]>`select * from invoices where order_id = ${orderId} order by id`)]
}
