import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import { VISIBILITY_BATCH_MAX, planVisibilityChanges, type VisibilityRow } from '@/lib/staff-visibility'

export const runtime = 'nodejs'

type ListRow = {
  slug: string
  nameHr: string
  kind: string
  active: boolean
  engrave: boolean
  priceCents: number
  compareCents: number | null
  supplierUrl: string
  setItems: { productId: number; slug: string }[] | null
}

/** Staff can read every product with its visibility, supplier link and the cases inside a set. */
export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await sql<ListRow[]>`
    select slug, name_hr, kind, active, engrave, price_cents, compare_cents, supplier_url, set_items
    from products order by kind, slug`
  return Response.json({
    products: rows.map((r) => ({
      slug: r.slug,
      name: r.nameHr,
      kind: r.kind,
      active: r.active,
      engrave: r.engrave,
      priceCents: r.priceCents,
      compareCents: r.compareCents,
      supplierUrl: r.supplierUrl,
      setItems: (r.setItems ?? []).map((item) => item.slug),
    })),
  })
}

const bodySchema = z.object({
  items: z
    .array(z.object({ slug: z.string().trim().min(1).max(200), active: z.boolean() }))
    .min(1)
    .max(VISIBILITY_BATCH_MAX),
})

/** Staff can hide products from the shop or show them again. All or nothing; the answer lists the old state for undo. */
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
  const plan = await sql.begin(async (tx) => {
    const rows = await tx<VisibilityRow[]>`
      select id, slug, active from products where slug in ${tx(items.map((i) => i.slug))} for update`
    const planned = planVisibilityChanges(rows, items)
    if (!planned.ok) return planned
    for (const c of planned.changes) {
      await tx`update products set active = ${c.to}, updated_at = now() where id = ${c.id}`
    }
    return planned
  })
  if (!plan.ok) return Response.json({ error: plan.error, slugs: plan.slugs ?? [] }, { status: 400 })
  revalidateTag('products', { expire: 0 })
  revalidatePath('/[locale]', 'layout')
  return Response.json({ changed: plan.changes.map(({ slug, from, to }) => ({ slug, from, to })) })
}
