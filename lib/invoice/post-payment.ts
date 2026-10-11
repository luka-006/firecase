import 'server-only'
import { sql } from '../db'
import { getSettingsFresh } from '../settings'
import { sendOrderConfirmation } from '../mail'
import { logConfirmationEmail } from '../mail/order-email-log'
import type { Invoice, Order } from '../types'
import {
  ensureOrderInvoice,
  getInvoicePdfBytes,
  getInvoicesForOrder,
  retryIssueInvoice,
  waitForOrderInvoice,
} from './index'

async function freshOrder(orderId: number) {
  const [row] = await sql<Order[]>`select * from orders where id = ${orderId}`
  return row ?? null
}

export async function sendOrderConfirmationIfNeeded(order: Order, inv?: Invoice | null) {
  if (order.confirmationEmailSentAt) return
  const settings = await getSettingsFresh()
  const delivery = order.locale === 'en' ? settings.deliveryEn : settings.deliveryHr
  let pdf: { number: string; pdf: Uint8Array } | undefined
  let invoicePending = false
  const invoice =
    inv ??
    (await getInvoicesForOrder(order.id)).find((i) => !i.stornoOf && i.fiscalStatus === 'ok' && i.soloPdfUrl) ??
    null
  if (invoice?.soloPdfUrl) {
    try {
      pdf = { number: invoice.number, pdf: await getInvoicePdfBytes(invoice) }
    } catch (e) {
      console.error('[mail] PDF računa', order.id, (e as Error).message)
      invoicePending = true
    }
  } else {
    invoicePending = true
  }
  const confirmResult = await sendOrderConfirmation(order, pdf, delivery || undefined, { invoicePending })
  await logConfirmationEmail(order.id, confirmResult.ok ? { ok: true } : { ok: false, error: confirmResult.error })
}

/** Solo izdavanje + mail kupcu (idempotentno). */
export async function completePaidOrderDelivery(order: Order) {
  const current = (await freshOrder(order.id)) ?? order
  if (['pending', 'cancelled'].includes(current.status)) return

  let inv: Invoice | null = null
  try {
    inv = await waitForOrderInvoice(current, 120_000)
  } catch (e) {
    console.error('[invoice] pozadinsko izdavanje', current.id, (e as Error).message)
  }
  await sendOrderConfirmationIfNeeded(current, inv)
}

/** Jedan pending račun (Solo red min. 10 s između API poziva). */
export async function drainPendingInvoices(limit = 5) {
  const pending = await sql<Invoice[]>`select * from invoices where fiscal_status = 'pending' and storno_of is null order by id limit ${limit}`
  let ok = 0
  for (const inv of pending) {
    const row = await retryIssueInvoice(inv.id)
    if (row?.fiscalStatus === 'ok') {
      ok++
      const order = await freshOrder(row.orderId)
      if (order) await sendOrderConfirmationIfNeeded(order, row)
    }
  }
  return { pending: pending.length, ok }
}

export async function kickInvoiceForOrder(orderId: number) {
  const order = await freshOrder(orderId)
  if (!order || ['pending', 'cancelled'].includes(order.status)) return
  const existing = (await getInvoicesForOrder(orderId)).find((i) => !i.stornoOf)
  if (existing?.fiscalStatus === 'ok' && existing.soloPdfUrl) {
    await sendOrderConfirmationIfNeeded(order, existing)
    return
  }
  try {
    await ensureOrderInvoice(order)
  } catch (e) {
    console.error('[invoice] kick narudžba', orderId, (e as Error).message)
  }
  const updated = await freshOrder(orderId)
  if (updated) await sendOrderConfirmationIfNeeded(updated)
}
