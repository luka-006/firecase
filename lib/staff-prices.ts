/** Price changes sent by staff: checked here before anything is written. Import-free so tests run without Next. */

export const PRICE_MIN_CENTS = 99
export const PRICE_MAX_CENTS = 100000
export const PRICE_BATCH_MAX = 60

export type PriceItem = { slug: string; priceCents: number }
export type PriceRow = { id: number; slug: string; priceCents: number }
export type PricePlan =
  | { ok: true; changes: { id: number; slug: string; from: number; to: number }[] }
  | { ok: false; error: string; slugs?: string[] }

export function planPriceChanges(rows: PriceRow[], items: PriceItem[]): PricePlan {
  if (!items.length) return { ok: false, error: 'No prices sent' }
  if (items.length > PRICE_BATCH_MAX) return { ok: false, error: `At most ${PRICE_BATCH_MAX} prices at once` }
  const seen = new Set<string>()
  const twice = items.filter((i) => (seen.has(i.slug) ? true : (seen.add(i.slug), false))).map((i) => i.slug)
  if (twice.length) return { ok: false, error: 'A product is listed twice', slugs: twice }
  const bad = items
    .filter((i) => !Number.isInteger(i.priceCents) || i.priceCents < PRICE_MIN_CENTS || i.priceCents > PRICE_MAX_CENTS)
    .map((i) => i.slug)
  if (bad.length) return { ok: false, error: `Prices must be whole cents from ${PRICE_MIN_CENTS} to ${PRICE_MAX_CENTS}`, slugs: bad }
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const missing = items.filter((i) => !bySlug.has(i.slug)).map((i) => i.slug)
  if (missing.length) return { ok: false, error: 'Unknown products', slugs: missing }
  return {
    ok: true,
    changes: items.map((i) => {
      const row = bySlug.get(i.slug) as PriceRow
      return { id: row.id, slug: row.slug, from: row.priceCents, to: i.priceCents }
    }),
  }
}
