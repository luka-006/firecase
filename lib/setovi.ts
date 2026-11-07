/**
 * Visible name of a bundle of cases.
 * Change SET_ENTITY_LABEL to rename the admin tab and the headings that use it.
 * Example set names stay free text, such as "Set Trio" or "Set Penta".
 */
export const SET_ENTITY_LABEL = 'Setovi'
export const SET_ENTITY_ONE = 'Set'
export const SET_ADMIN_HREF = '/admin/setovi'

export const SET_ITEM_MIN = 3
export const SET_ITEM_MAX = 5

export type SetItemRef = { productId: number; slug: string }

export type PricedPart = {
  priceCents: number
  costCents: number | null
  missing?: boolean
}

export type SetQuote = {
  separateCents: number | null
  savingsCents: number | null
  costCents: number | null
  marginCents: number | null
  complete: boolean
}

/** Live sum of the included cases, their cost, and the margin against the set price. */
export function quoteSet(priceCents: number, parts: PricedPart[]): SetQuote {
  const complete = parts.length > 0 && parts.every((part) => !part.missing)
  const separateCents = complete ? parts.reduce((sum, part) => sum + part.priceCents, 0) : null
  const savingsCents = separateCents == null ? null : separateCents - priceCents
  const costKnown = complete && parts.every((part) => part.costCents != null)
  const costCents = costKnown ? parts.reduce((sum, part) => sum + (part.costCents ?? 0), 0) : null
  const marginCents = costCents == null ? null : priceCents - costCents
  return { separateCents, savingsCents, costCents, marginCents, complete }
}

export function cartHasFreeShipping(items: { freeShipping?: boolean }[]) {
  return items.some((item) => !!item.freeShipping)
}

/** Draft and review are still waiting. Accepted and rejected are closed. */
export function isPendingSetProposalStatus(status: string) {
  return status === 'draft' || status === 'review'
}

/** A published set is a product row with kind set. Proposals are a different table. */
export function isSetProduct(p: { kind?: string | null }) {
  return p.kind === 'set'
}

/** Public catalogue is active products only. Inactive sets and cases stay hidden. */
export function publishedProducts<T extends { active?: boolean }>(products: T[]) {
  return products.filter((p) => p.active !== false)
}

export function catalogueCases<T extends { kind?: string | null; active?: boolean }>(products: T[]) {
  return publishedProducts(products).filter((p) => !isSetProduct(p))
}

export function catalogueSets<T extends { kind?: string | null; active?: boolean }>(products: T[]) {
  return publishedProducts(products).filter((p) => isSetProduct(p))
}

/**
 * Homepage assortment: alternate a classic case and a published set so neither
 * group is dropped when the list is capped. Inactive rows are left out.
 */
export function mixHomeCollection<T extends { kind?: string | null; active?: boolean }>(products: T[], limit = 8) {
  const cases = catalogueCases(products)
  const sets = catalogueSets(products)
  const out: T[] = []
  let c = 0
  let s = 0
  while (out.length < limit && (c < cases.length || s < sets.length)) {
    if (c < cases.length) out.push(cases[c++])
    if (out.length < limit && s < sets.length) out.push(sets[s++])
  }
  return out
}

type StockTouch = { qty: number; variant?: string; variantIndex?: number }

export function orderStockGroups(items: {
  productId: number
  qty: number
  variant?: string
  variantIndex?: number
  components?: { productId: number; qty: number; variant?: string; variantIndex?: number }[]
}[]): { productId: number; lines: StockTouch[] }[] {
  const map = new Map<number, StockTouch[]>()
  const add = (productId: number, line: StockTouch) => {
    if (!productId) return
    const cur = map.get(productId) ?? []
    cur.push(line)
    map.set(productId, cur)
  }
  for (const item of items) {
    add(item.productId, { qty: item.qty, variant: item.variant, variantIndex: item.variantIndex })
    for (const part of item.components ?? []) {
      if (!part.productId || part.productId === item.productId) continue
      add(part.productId, {
        qty: item.qty * (part.qty > 0 ? part.qty : 1),
        variant: part.variant,
        variantIndex: part.variantIndex,
      })
    }
  }
  return [...map.entries()].map(([productId, lines]) => ({ productId, lines }))
}
