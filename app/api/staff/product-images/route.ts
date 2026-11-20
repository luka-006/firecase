import { revalidatePath, revalidateTag } from 'next/cache'
import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import { productImagesSchema } from '@/lib/product-images'

export const runtime = 'nodejs'

type Row = { id: number; slug: string; images: string[] }

/** Staff can read the photos of a product by slug. */
export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const slug = new URL(req.url).searchParams.get('slug')?.trim()
  if (!slug) return Response.json({ error: 'slug is required' }, { status: 400 })
  const [row] = await sql<Row[]>`select id, slug, images from products where slug = ${slug}`
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ product: row })
}

/** Staff can replace the photos of an existing product. Nothing else on the product changes. */
export async function PATCH(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = productImagesSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { slug, images } = parsed.data
  const [old] = await sql<Row[]>`select id, slug, images from products where slug = ${slug}`
  if (!old) return Response.json({ error: 'Not found' }, { status: 404 })
  const [row] = await sql<Row[]>`
    update products set images = ${sql.json(images)}, updated_at = now() where id = ${old.id} returning id, slug, images`
  revalidateTag('products', { expire: 0 })
  revalidatePath('/[locale]', 'layout')
  return Response.json({ product: row, previousImages: old.images })
}
