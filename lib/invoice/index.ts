import 'server-only'
import { sql } from '../db'
import { SELLER } from '../config'
import { getSettingsFresh } from '../settings'
import { zagrebParts } from '../money'
import { computeZki, sendReceipt, type FiscalReceipt } from './fiscal'
import type { Invoice, InvoiceData, Order } from '../types'

export function paymentCodeFor(method: string | null) {
  // Kartice (uklj. Apple Pay / Google Pay) = K, ostalo (PayPal) = O
  if (!method) return 'K'
  return /paypal/i.test(method) ? 'O' : 'K'
}

function receiptOf(inv: Invoice): FiscalReceipt {
  return {
    oib: SELLER.oib,
    issuedAt: new Date(inv.issuedAt),
    seq: inv.seq,
    premises: inv.data.premises,
    device: inv.data.device,
    seqMode: inv.data.seqMode,
    totalCents: inv.totalCents,
    paymentCode: inv.paymentCode,
    operatorOib: inv.data.operatorOib,
  }
}

export async function fiscalize(inv: Invoice): Promise<Invoice> {
  const s = await getSettingsFresh()
  const late = inv.fiscalAttempts > 0
  try {
    const r = receiptOf(inv)
    const zki = inv.zki || computeZki(r)
    if (!inv.zki) await sql`update invoices set zki = ${zki} where id = ${inv.id}`
    const jir = await sendReceipt(r, zki, late, s.fiscalEnv)
    const [row] = await sql<Invoice[]>`update invoices set jir = ${jir}, zki = ${zki}, fiscal_status = 'ok',
      fiscal_error = null, fiscal_attempts = fiscal_attempts + 1 where id = ${inv.id} returning *`
    return row
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500)
    console.error('[fiscal]', inv.number, msg)
    const [row] = await sql<Invoice[]>`update invoices set fiscal_status = 'pending', fiscal_error = ${msg},
      fiscal_attempts = fiscal_attempts + 1 where id = ${inv.id} returning *`
    return row
  }
}

export async function issueInvoice(order: Order, storno?: Invoice): Promise<Invoice> {
  const s = await getSettingsFresh()
  const issuedAt = new Date()
  const year = Number(zagrebParts(issuedAt).year)
  const paymentCode = storno ? storno.paymentCode : paymentCodeFor(order.paymentMethod)
  const items = storno
    ? storno.data.items.map((i) => ({ ...i, unitCents: -i.unitCents, totalCents: -i.totalCents }))
    : order.items.map((i) => ({ name: i.name, variant: i.variant || undefined, qty: i.qty, unitCents: i.unitCents, totalCents: i.unitCents * i.qty }))
  const shippingCents = storno ? -storno.data.shippingCents : order.shippingCents
  const totalCents = storno ? -storno.totalCents : order.totalCents

  const data: InvoiceData = {
    seller: { legalName: SELLER.legalName, address: SELLER.address, postal: SELLER.postal, city: SELLER.city, oib: SELLER.oib, email: SELLER.email },
    buyer: { name: order.name, email: order.email, address: order.address, postal: order.postal, city: order.city, country: order.country },
    items,
    shippingCents,
    totalCents,
    paymentLabel: order.paymentMethod || 'Kartica',
    orderPublicId: order.publicId,
    orderId: order.id,
    operatorOib: SELLER.oib,
    premises: storno?.data.premises ?? s.premises,
    device: storno?.data.device ?? s.device,
    seqMode: s.seqMode,
    locale: order.locale,
    stornoOfNumber: storno?.number,
  }

  const inv = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(733101)`
    const [{ next }] = await tx<{ next: number }[]>`select coalesce(max(seq), 0)::int + 1 as next from invoices where year = ${year}`
    const number = `${next}/${data.premises}/${data.device}`
    const [row] = await tx<Invoice[]>`insert into invoices ${tx({
      orderId: order.id, year, seq: next, number, issuedAt, totalCents, paymentCode,
      stornoOf: storno?.id ?? null, fiscalStatus: s.fiscalEnabled ? 'pending' : 'off',
      data: tx.json(data as never),
    })} returning *`
    return row
  })
  return s.fiscalEnabled ? fiscalize(inv) : inv
}

export async function getInvoicesForOrder(orderId: number) {
  return [...(await sql<Invoice[]>`select * from invoices where order_id = ${orderId} order by id`)]
}
