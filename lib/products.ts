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

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (!ids.length) return []
  return [...(await sql<Product[]>`select * from products where id in ${sql(ids)} and active`)]
}
