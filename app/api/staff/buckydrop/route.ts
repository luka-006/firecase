import { z } from 'zod'
import { staffApiAuthorized } from '@/lib/auth'
import { buckydropBalance, buckydropProduct, buckydropSearch, buckydropShipping } from '@/lib/buckydrop'

export const runtime = 'nodejs'

// Read-only sourcing for staff assistants: search, product detail, shipping estimate, balance.
// The BuckyDrop keys stay on the server; nothing here creates or pays an order.
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('balance') }),
  z.object({
    action: z.literal('search'),
    keyword: z.string().trim().min(1).max(120),
    platform: z.enum(['TB', 'ALIBABA']).optional(),
    page: z.number().int().min(1).max(50).optional(),
    size: z.number().int().min(1).max(40).optional(),
    sort: z.enum(['sales', 'price_asc']).optional(),
  }),
  z.object({ action: z.literal('detail'), link: z.string().trim().url().max(600) }),
  z.object({
    action: z.literal('shipping'),
    country: z.string().trim().regex(/^[A-Za-z]{2}$/),
    grams: z.number().positive().max(30000),
    count: z.number().int().min(1).max(100),
    cny: z.number().min(0).max(100000),
  }),
])

export async function POST(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const b = parsed.data
  const r =
    b.action === 'balance' ? await buckydropBalance()
    : b.action === 'search' ? await buckydropSearch(b.keyword, { platform: b.platform, page: b.page, size: b.size, sort: b.sort })
    : b.action === 'detail' ? await buckydropProduct(b.link)
    : await buckydropShipping(b.country.toUpperCase(), Math.round(b.grams) / 1000, b.count, Math.round(b.cny * 100) / 100)
  return r.ok ? Response.json({ data: r.data }) : Response.json({ error: r.error, code: r.code }, { status: 502 })
}
