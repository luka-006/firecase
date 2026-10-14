import 'server-only'
import { sql } from '../db'
import { getSettingsFresh } from '../settings'
import { sendAdminInvoiceFailed, sendInvoiceEmail, sendOrderConfirmation } from '../mail'
import { logConfirmationEmail, logInvoiceEmail } from '../mail/order-email-log'
import type { Invoice, Order } from '../types'
import { ensureOrderInvoice, getInvoicePdfBytes, retryIssueInvoice } from './index'

async function freshOrder(orderId: number) {
  const [row] = await sql<Order[]>`select * from orders where id = ${orderId}`
  return row ?? null
}

export async function sendOrderConfirmationIfNeeded(order: Order) {
  if (order.confirmationEmailSentAt) return
  const claimed = await sql`update orders set confirmation_email_sent_at = now(), confirmation_email_error = null
    where id = ${order.id} and confirmation_email_sent_at is null returning id`
  if (!claimed.length) return
  const settings = await getSettingsFresh()
  const delivery = order.locale === 'en' ? settings.deliveryEn : settings.deliveryHr
  const confirmResult = await sendOrderConfirmation(order, delivery || undefined)
  if (!confirmResult.ok) {
    await logConfirmationEmail(order.id, { ok: false, error: confirmResult.error })
    await sql`update orders set confirmation_email_sent_at = null where id = ${order.id}`
  }
}

async function notifyAdminInvoiceFailure(order: Order, error: string) {
  if (order.invoiceAdminNotifiedAt) return
  const result = await sendAdminInvoiceFailed(order, error)
  if (result.ok) {
    await sql`update orders set invoice_admin_notified_at = now() where id = ${order.id} and invoice_admin_notified_at is null`
  }
}

export async function sendInvoiceEmailIfNeeded(order: Order, inv: Invoice) {
  if (order.invoiceEmailSentAt) return
  if (inv.fiscalStatus !== 'ok' || !inv.soloPdfUrl) return
  const claimed = await sql`update orders set invoice_email_sent_at = now(), invoice_email_error = null
    where id = ${order.id} and invoice_email_sent_at is null returning id`
  if (!claimed.length) return
  let pdf: Uint8Array
  try {
    pdf = await getInvoicePdfBytes(inv)
  } catch (e) {
    await sql`update orders set invoice_email_sent_at = null where id = ${order.id}`
    await notifyAdminInvoiceFailure(order, (e as Error).message)
    return
  }
  const result = await sendInvoiceEmail(order, { number: inv.number, pdf })
  if (!result.ok) {
    await logInvoiceEmail(order.id, { ok: false, error: result.error })
    await sql`update orders set invoice_email_sent_at = null where id = ${order.id}`
  }
}

async function deliverInvoiceOutcome(order: Order, inv: Invoice | null) {
  if (!inv) return
  const current = (await freshOrder(order.id)) ?? order
  if (inv.fiscalStatus === 'ok' && inv.soloPdfUrl) {
    await sendInvoiceEmailIfNeeded(current, inv)
    return
  }
  if (inv.fiscalError) await notifyAdminInvoiceFailure(current, inv.fiscalError)
}

/** Potvrda odmah nakon plaćanja, račun tek kad ga Solo izda. */
export async function completePaidOrderDelivery(order: Order) {
  const current = (await freshOrder(order.id)) ?? order
  if (['pending', 'cancelled'].includes(current.status)) return
  await sendOrderConfirmationIfNeeded(current)
  let inv: Invoice | null = null
  try {
    inv = await ensureOrderInvoice(current)
  } catch (e) {
    console.error('[invoice] izdavanje', current.id, (e as Error).message)
    await notifyAdminInvoiceFailure(current, (e as Error).message)
    return
  }
  await deliverInvoiceOutcome(current, inv)
}

/** Jedan pending račun (Solo red min. 10 s između API poziva). */
export async function drainPendingInvoices(limit = 5) {
  const pending = await sql<Invoice[]>`select * from invoices where fiscal_status = 'pending' and storno_of is null order by id limit ${limit}`
  let ok = 0
  for (const inv of pending) {
    const row = await retryIssueInvoice(inv.id)
    const order = row ? await freshOrder(row.orderId) : null
    if (!row || !order) continue
    if (row.fiscalStatus === 'ok') {
      ok++
      await sendOrderConfirmationIfNeeded(order)
      await sendInvoiceEmailIfNeeded(order, row)
    } else if (row.fiscalError) {
      await notifyAdminInvoiceFailure(order, row.fiscalError)
    }
  }
  return { pending: pending.length, ok }
}

export async function kickInvoiceForOrder(orderId: number) {
  const order = await freshOrder(orderId)
  if (!order || ['pending', 'cancelled'].includes(order.status)) return
  await sendOrderConfirmationIfNeeded(order)
  try {
    const inv = await ensureOrderInvoice(order)
    await deliverInvoiceOutcome(order, inv)
  } catch (e) {
    console.error('[invoice] kick narudžba', orderId, (e as Error).message)
    await notifyAdminInvoiceFailure(order, (e as Error).message)
  }
}
