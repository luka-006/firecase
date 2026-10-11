import { sql } from '@/lib/db'
import { retryIssueInvoice } from '@/lib/invoice'
import type { Invoice } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Ponovno izdavanje računa koji nisu prošli Solo API (Vercel Cron, min. 10 s između poziva). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const pending = await sql<Invoice[]>`select * from invoices where fiscal_status = 'pending' and storno_of is null order by id limit 5`
  let ok = 0
  for (const inv of pending) {
    const row = await retryIssueInvoice(inv.id)
    if (row?.fiscalStatus === 'ok') ok++
  }
  return Response.json({ pending: pending.length, ok })
}
