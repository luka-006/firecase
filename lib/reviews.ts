import 'server-only'
import { unstable_cache } from 'next/cache'
import { sql } from './db'
import type { Locale } from './routes'
import type { Review } from './types'

export type PublicReview = {
  id: number
  rating: number
  body: string
  displayName: string
  createdAt: string
  variant: string
}

export type HomeReview = PublicReview & {
  productSlug: string
  nameHr: string
  nameEn: string
}

export type ReviewBundle = {
  count: number
  average: number
  reviews: PublicReview[]
}

const emptyBundle: ReviewBundle = { count: 0, average: 0, reviews: [] }

function toPublic(row: {
  id: number
  rating: number
  body: string
  displayName: string
  createdAt: Date | string
  variant: string
}): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    displayName: row.displayName,
    createdAt: new Date(row.createdAt).toISOString(),
    variant: row.variant,
  }
}

export const getProductReviewBundle = unstable_cache(
  async (productId: number): Promise<ReviewBundle> => {
    try {
      const [sum] = await sql<{ count: number; average: number }[]>`
        select count(*)::int as count, coalesce(avg(rating), 0)::float8 as average
        from reviews where product_id = ${productId} and status = 'approved'`
      if (!sum?.count) return emptyBundle
      const rows = await sql<{
        id: number
        rating: number
        body: string
        displayName: string
        createdAt: Date
        variant: string
      }[]>`
        select id, rating, body, display_name, created_at, variant
        from reviews
        where product_id = ${productId} and status = 'approved'
        order by created_at desc
        limit 100`
      return { count: sum.count, average: Number(sum.average) || 0, reviews: rows.map(toPublic) }
    } catch (e) {
      console.error('[reviews]', (e as Error).message)
      return emptyBundle
    }
  },
  ['product-reviews'],
  { tags: ['reviews'], revalidate: 300 },
)

export const getHomepageReviews = unstable_cache(
  async (): Promise<HomeReview[]> => {
    try {
      const rows = await sql<{
        id: number
        rating: number
        body: string
        displayName: string
        createdAt: Date
        variant: string
        productSlug: string
        nameHr: string
        nameEn: string
      }[]>`
        select r.id, r.rating, r.body, r.display_name, r.created_at, r.variant,
               p.slug as product_slug, p.name_hr, p.name_en
        from reviews r
        join products p on p.id = r.product_id and p.active
        where r.status = 'approved' and length(trim(r.body)) > 0
        order by r.created_at desc
        limit 3`
      return rows.map((row) => ({
        ...toPublic(row),
        productSlug: row.productSlug,
        nameHr: row.nameHr,
        nameEn: row.nameEn,
      }))
    } catch (e) {
      console.error('[reviews]', (e as Error).message)
      return []
    }
  },
  ['home-reviews'],
  { tags: ['reviews'], revalidate: 300 },
)

export async function getOrderReviews(orderId: number) {
  return [...(await sql<Review[]>`select * from reviews where order_id = ${orderId} order by item_index`)]
}

export async function insertReviews(
  orderId: number,
  rows: { itemIndex: number; productId: number; productName: string; variant: string; rating: number; body: string }[],
  displayName: string,
  locale: Locale,
) {
  await sql.begin(async (tx) => {
    const [locked] = await tx<{ id: number; status: string }[]>`select id, status from orders where id = ${orderId} for update`
    if (!locked || !['shipped', 'delivered'].includes(locked.status)) {
      const err = new Error('closed')
      ;(err as { code?: string }).code = 'CLOSED'
      throw err
    }
    const [again] = await tx<{ id: number }[]>`select id from reviews where order_id = ${orderId} limit 1`
    if (again) {
      const err = new Error('exists')
      ;(err as { code?: string }).code = 'EXISTS'
      throw err
    }
    for (const row of rows) {
      await tx`
        insert into reviews (order_id, product_id, item_index, product_name, variant, rating, body, display_name, locale)
        values (
          ${orderId},
          (select id from products where id = ${row.productId}),
          ${row.itemIndex},
          ${row.productName},
          ${row.variant},
          ${row.rating},
          ${row.body},
          ${displayName},
          ${locale}
        )`
    }
  })
}
