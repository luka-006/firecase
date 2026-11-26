import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import { PRICE_BATCH_MAX, planPriceChanges, type PriceRow } from '@/lib/staff-prices'

export const runtime = 'nodejs'

/** Staff can read the selling price of every product. */
export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await sql<(PriceRow & { kind: string; active: boolean })[]>`
    select id, slug, price_cents, kind, active from products order by kind, slug`
  return Response.json({ prices: rows.map((r) => ({ slug: r.slug, priceCents: r.priceCents, kind: r.kind, active: r.active })) })
}

const bodySchema = z.object({
  items: z
    .array(z.object({ slug: z.string().trim().min(1).max(200), priceCents: z.number() }))
    .min(1)
    .max(PRICE_BATCH_MAX),
})

/** Staff can change selling prices. All or nothing; the answer lists the old prices for undo. */
export async function PATCH(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { items } = parsed.data
  const changes = await sql.begin(async (tx) => {
    const rows = await tx<PriceRow[]>`
      select id, slug, price_cents from products where slug in ${tx(items.map((i) => i.slug))} for update`
    const plan = planPriceChanges(rows, items)
    if (!plan.ok) return plan
    for (const c of plan.changes) {
      await tx`update products set price_cents = ${c.to}, updated_at = now() where id = ${c.id}`
    }
    return plan
  })
  if (!changes.ok) return Response.json({ error: changes.error, slugs: changes.slugs ?? [] }, { status: 400 })
  revalidateTag('products', { expire: 0 })
  revalidatePath('/[locale]', 'layout')
  return Response.json({ changed: changes.changes.map(({ slug, from, to }) => ({ slug, from, to })) })
}
