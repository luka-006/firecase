import { sql } from '@/lib/db'
import { fiscalize } from '@/lib/invoice'
import type { Invoice } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// Ponovno slanje računa koji nisu fiskalizirani (naknadna dostava). Pokreće Vercel Cron.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const pending = await sql<Invoice[]>`select * from invoices where fiscal_status = 'pending' order by id limit 50`
  let ok = 0
  for (const inv of pending) if ((await fiscalize(inv)).fiscalStatus === 'ok') ok++
  return Response.json({ pending: pending.length, ok })
}
