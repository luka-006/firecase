import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { getInvoicePdfBytes } from '@/lib/invoice'
import type { Invoice } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = new URL(req.url).searchParams.get('t')
  const [inv] = await sql<(Invoice & { publicId: string })[]>`
    select i.*, o.public_id from invoices i join orders o on o.id = i.order_id where i.id = ${Number(id) || 0}`
  if (!inv || !(token === inv.publicId || (await isAdmin()))) return new Response('Not found', { status: 404 })
  if (!inv.soloPdfUrl) return new Response('Račun još nije spreman.', { status: 503 })
  try {
    const pdf = await getInvoicePdfBytes(inv)
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="racun-${inv.number.replace(/\//g, '-')}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return new Response((e as Error).message, { status: 502 })
  }
}
