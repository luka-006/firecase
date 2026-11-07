import 'server-only'
import { unstable_cache } from 'next/cache'
import { sql } from './db'
import type { Product } from './types'

export const getActiveProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      return [...(await sql<Product[]>`select * from products where active order by featured desc, sort asc, id desc`)]
    } catch (e) {
      console.error('[products]', (e as Error).message)
      return []
    }
  },
  ['products-active'],
  { tags: ['products'], revalidate: 300 },
)

// lowest30 = najniža cijena u 30 dana prije zadnje promjene cijene (Omnibus)
export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    try {
      const rows = await sql<Product[]>`
        select p.*, (
          select min(t.price_cents) from (
            select h.price_cents from price_history h
              where h.product_id = p.id and h.changed_at > now() - interval '30 days'
              and h.id <> (select max(id) from price_history where product_id = p.id)
            union all
            select x.price_cents from (
              select h2.price_cents from price_history h2
              where h2.product_id = p.id and h2.changed_at <= now() - interval '30 days'
              order by h2.changed_at desc limit 1
            ) x
          ) t
        ) as lowest30
        from products p where p.slug = ${slug} and p.active`
      return rows[0] ? { ...rows[0] } : null
    } catch (e) {
      console.error('[products]', (e as Error).message)
      return null
    }
  },
  ['product-by-slug'],
  { tags: ['products'], revalidate: 300 },
)

/** Old URL of a product that is still for sale. Hidden products are not revealed. */
export async function canonicalSlugForAlias(slug: string): Promise<string | null> {
  try {
    const rows = await sql<{ slug: string }[]>`
      select p.slug
      from product_slug_aliases a
      join products p on p.id = a.product_id
      where a.slug = ${slug} and p.active
      limit 1`
    const next = rows[0]?.slug
    return next && next !== slug ? next : null
  } catch (e) {
    if ((e as { code?: string }).code === '42P01') return null
    console.error('[products]', (e as Error).message)
    return null
  }
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (!ids.length) return []
  return [...(await sql<Product[]>`select * from products where id in ${sql(ids)} and active`)]
}

export async function getProductsByIdsAll(ids: number[]): Promise<Product[]> {
  if (!ids.length) return []
  return [...(await sql<Product[]>`select * from products where id in ${sql(ids)}`)]
}
