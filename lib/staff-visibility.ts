/** Show or hide products, sent by staff: checked here before anything is written. Import-free so tests run without Next. */

export const VISIBILITY_BATCH_MAX = 60

export type VisibilityItem = { slug: string; active: boolean }
export type VisibilityRow = { id: number; slug: string; active: boolean }
export type VisibilityPlan =
  | { ok: true; changes: { id: number; slug: string; from: boolean; to: boolean }[] }
  | { ok: false; error: string; slugs?: string[] }

/** Hiding keeps the product and its orders; it only takes it off the shop. Products already in the wanted state are left out. */
export function planVisibilityChanges(rows: VisibilityRow[], items: VisibilityItem[]): VisibilityPlan {
  if (!items.length) return { ok: false, error: 'No products sent' }
  if (items.length > VISIBILITY_BATCH_MAX) return { ok: false, error: `At most ${VISIBILITY_BATCH_MAX} products at once` }
  const seen = new Set<string>()
  const twice = items.filter((i) => (seen.has(i.slug) ? true : (seen.add(i.slug), false))).map((i) => i.slug)
  if (twice.length) return { ok: false, error: 'A product is listed twice', slugs: twice }
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const missing = items.filter((i) => !bySlug.has(i.slug)).map((i) => i.slug)
  if (missing.length) return { ok: false, error: 'Unknown products', slugs: missing }
  return {
    ok: true,
    changes: items
      .map((i) => {
        const row = bySlug.get(i.slug) as VisibilityRow
        return { id: row.id, slug: row.slug, from: row.active, to: i.active }
      })
      .filter((c) => c.from !== c.to),
  }
}
