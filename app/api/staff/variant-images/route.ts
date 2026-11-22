import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import type { Variant } from '@/lib/types'

export const runtime = 'nodejs'

type Row = { id: number; slug: string; images: string[]; variants: Variant[] }

const view = (row: Row) => ({
  slug: row.slug,
  images: row.images,
  variants: row.variants.map((v, i) => ({ index: i, hr: v.hr, image: v.image ?? null })),
})

/** Staff can read which photo belongs to which colour. */
export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const slug = new URL(req.url).searchParams.get('slug')?.trim()
  if (!slug) return Response.json({ error: 'slug is required' }, { status: 400 })
  const [row] = await sql<Row[]>`select id, slug, images, variants from products where slug = ${slug}`
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ product: view(row) })
}

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(200),
  /** One entry per colour, in order: a URL from the product's photos, or null for "first photo". */
  images: z.array(z.string().trim().max(1000).nullable()).max(50),
})

/** Staff can set the photo of each colour. Names, stock and supplier data of the colours stay as they are. */
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
  const { slug, images } = parsed.data
  const [old] = await sql<Row[]>`select id, slug, images, variants from products where slug = ${slug}`
  if (!old) return Response.json({ error: 'Not found' }, { status: 404 })
  if (images.length !== old.variants.length) return Response.json({ error: `Expected ${old.variants.length} entries, one per colour` }, { status: 400 })
  const unknown = images.filter((src): src is string => !!src && !old.images.includes(src))
  if (unknown.length) return Response.json({ error: 'Every photo must be one of the product photos', unknown }, { status: 400 })
  const variants = old.variants.map((v, i) => {
    const next: Variant = { ...v }
    if (images[i]) next.image = images[i] as string
    else delete next.image
    return next
  })
  const [row] = await sql<Row[]>`
    update products set variants = ${sql.json(variants as never)}, updated_at = now() where id = ${old.id} returning id, slug, images, variants`
  revalidateTag('products', { expire: 0 })
  revalidatePath('/[locale]', 'layout')
  return Response.json({ product: view(row), previous: view(old).variants })
}
