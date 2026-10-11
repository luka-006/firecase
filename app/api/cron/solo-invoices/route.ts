import { drainPendingInvoices } from '@/lib/invoice/post-payment'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Rezervni retry pending računa (Vercel Hobby: max. 1× dnevno). Solo red: min. 10 s između poziva. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const result = await drainPendingInvoices(20)
  return Response.json(result)
}
