import 'server-only'
import type postgres from 'postgres'
import { sql } from '../db'
import { SELLER } from '../config'
import { zagrebParts } from '../money'
import { createSoloInvoice, fetchSoloPdf, stornoSoloInvoice } from './solo'
import { sleep, withSoloApiSlot } from './solo-queue'
import type { Invoice, InvoiceData, Order } from '../types'

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
  const totalCents = storno ? -storno.totalCents : order.totalCents
  return {
    seller: { legalName: SELLER.legalName, address: SELLER.address, postal: SELLER.postal, city: SELLER.city, oib: SELLER.oib, email: SELLER.email },
    buyer: { name: order.name, email: order.email, address: order.address, postal: order.postal, city: order.city, country: order.country },
    items,
    shippingCents,
    discountCents,
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
  const placeholder = `PENDING-${order.id}-${Date.now()}`
  const [row] = await tx<Invoice[]>`insert into invoices ${tx({
    orderId: order.id,
    year,
    seq: 0,
    number: placeholder,
    issuedAt,
    totalCents: order.totalCents,
    paymentCode,
    stornoOf: null,
    fiscalStatus: 'pending',
    data: tx.json(data as never),
  })} returning *`
  return row
}

async function submitToSolo(order: Order, inv: Invoice): Promise<Invoice> {
  if (inv.soloId && inv.fiscalStatus === 'ok') return inv
  try {
    const solo = await withSoloApiSlot(() => createSoloInvoice(order, inv.data))
    const parts = solo.brojRacuna.split('-')
    const seq = Number(parts[0]) || inv.seq
    const [row] = await sql<Invoice[]>`update invoices set
      solo_id = ${solo.id},
      solo_number = ${solo.brojRacuna},
      solo_pdf_url = ${solo.pdf || null},
      number = ${solo.brojRacuna},
      seq = ${seq},
      jir = ${solo.jir || null},
      zki = ${solo.zki || null},
      fiscal_status = 'ok',
      fiscal_error = null,
      fiscal_attempts = fiscal_attempts + 1,
      issued_at = now()
      where id = ${inv.id} returning *`
    return row
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500)
    console.error('[solo]', order.id, msg)
    const [row] = await sql<Invoice[]>`update invoices set fiscal_status = 'pending', fiscal_error = ${msg},
      fiscal_attempts = fiscal_attempts + 1 where id = ${inv.id} returning *`
    return row
  }
}

/** Idempotentno izdavanje originalnog računa preko Soloa (jedan po narudžbi). */
export async function ensureOrderInvoice(order: Order): Promise<Invoice> {
  const inv = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${733103 + (order.id % 100000)})`
    const existing = await tx<Invoice[]>`select * from invoices where order_id = ${order.id} and storno_of is null order by id desc limit 1`
    if (existing[0]?.soloId && existing[0].fiscalStatus === 'ok') return existing[0]
    if (existing[0]) return existing[0]
    return insertPendingInvoice(tx, order, invoiceDataFromOrder(order))
  })
  if (inv.soloId && inv.fiscalStatus === 'ok') return inv
  return submitToSolo(order, inv)
}

export async function retryIssueInvoice(invoiceId: number): Promise<Invoice | null> {
  const [inv] = await sql<Invoice[]>`select * from invoices where id = ${invoiceId}`
  if (!inv || inv.stornoOf) return null
  const [order] = await sql<Order[]>`select * from orders where id = ${inv.orderId}`
  if (!order) return null
  return submitToSolo(order, inv)
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
    await withSoloApiSlot(() => stornoSoloInvoice(original.soloId!))
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
