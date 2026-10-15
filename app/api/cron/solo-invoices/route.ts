import { drainPendingInvoices } from '@/lib/invoice/post-payment'
import { sendDueReviewRequests } from '@/lib/review-mail'
import { drainSupplierWork } from '@/lib/supplier/fulfill'
import { safeSupplierMessage } from '@/lib/supplier/ids'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Jedini dnevni cron (Vercel Hobby: max. 1× dnevno).
 *  Računi u Soloa + zahtjevi za recenziju 14 dana nakon slanja. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const invoices = await drainPendingInvoices(20)
  let supplier: { retried: number; synced: number; shipped: number; error?: string } = { retried: 0, synced: 0, shipped: 0 }
  try {
    supplier = await drainSupplierWork(20)
  } catch (e) {
    const error = safeSupplierMessage((e as Error).message)
    console.error('[supplier]', error)
    supplier = { retried: 0, synced: 0, shipped: 0, error }
  }
  let reviews: { sent: number; failed: number; checked: number; error?: string } = { sent: 0, failed: 0, checked: 0 }
  try {
    reviews = await sendDueReviewRequests(20)
  } catch (e) {
    const error = (e as Error).message
    console.error('[reviews]', error)
    reviews = { sent: 0, failed: 0, checked: 0, error }
  }
  return Response.json({ ...invoices, supplier, reviews })
}
