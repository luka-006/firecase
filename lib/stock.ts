import type { Variant } from './types'

export type Stocked = { stock: number | null; variants: Variant[] }

export type StockLine = {
  qty: number
  vi?: number
  variant?: string
  variantIndex?: number
}

export function hasOwnStock(v: { stock?: number | null } | null | undefined): v is { stock: number } {
  return !!v && typeof v.stock === 'number' && Number.isFinite(v.stock)
}

/** null = not tracked (unlimited). A variant with its own number wins over the product. */
export function optionStock(product: Stocked, vi: number): number | null {
  const v = vi >= 0 ? product.variants[vi] : undefined
  if (hasOwnStock(v)) return v.stock
  return product.stock ?? null
}

export function isOptionSoldOut(product: Stocked, vi: number) {
  const n = optionStock(product, vi)
  return n !== null && n <= 0
}

export function isSoldOut(product: Stocked) {
  if (!product.variants.length) return product.stock !== null && product.stock <= 0
  return product.variants.every((_, i) => isOptionSoldOut(product, i))
}

/** Highest quantity still for sale. null when any option is unlimited. 0 when nothing is left. */
export function headlineStock(product: Stocked): number | null {
  const options = product.variants.length ? product.variants.map((_, i) => optionStock(product, i)) : [product.stock]
  if (options.some((n) => n === null)) return null
  const left = options.filter((n): n is number => n !== null && n > 0)
  if (!left.length) return 0
  return Math.max(...left)
}

export function isLowStock(product: Stocked) {
  const n = headlineStock(product)
  return n !== null && n >= 1 && n <= 10
}

/** Low stock (1–10) first. Relative order inside each group stays as given. */
export function withLowStockFirst<T extends Stocked>(list: T[]): T[] {
  const low: T[] = []
  const rest: T[] = []
  for (const item of list) (isLowStock(item) ? low : rest).push(item)
  return [...low, ...rest]
}

export function needsStockAttention(product: Stocked) {
  if (product.stock !== null && product.stock <= 10) return true
  return product.variants.some((v) => hasOwnStock(v) && v.stock <= 10)
}

export function resolveVariantIndex(product: Stocked, line: StockLine) {
  if (typeof line.variantIndex === 'number' && product.variants[line.variantIndex]) return line.variantIndex
  if (line.variant) {
    const named = product.variants.findIndex((v) => v.hr === line.variant || v.en === line.variant)
    if (named >= 0) return named
  }
  if (typeof line.vi === 'number' && line.vi >= 0 && product.variants[line.vi]) return line.vi
  return -1
}

export function exceedsStock(product: Stocked, lines: StockLine[]) {
  let shared = 0
  const own = new Map<number, number>()
  for (const line of lines) {
    if (line.qty <= 0) continue
    const vi = resolveVariantIndex(product, line)
    const v = vi >= 0 ? product.variants[vi] : undefined
    if (hasOwnStock(v)) own.set(vi, (own.get(vi) ?? 0) + line.qty)
    else shared += line.qty
  }
  for (const [vi, qty] of own) {
    if ((product.variants[vi].stock as number) < qty) return true
  }
  return product.stock !== null && shared > product.stock
}

/** sign -1 takes stock for a paid order, +1 puts it back. Unlimited (null) is left alone. */
export function moveStock(product: Stocked, lines: StockLine[], sign: 1 | -1): Stocked {
  const variants = product.variants.map((v) => ({ ...v }))
  let stock = product.stock
  let shared = 0
  const own = new Map<number, number>()
  for (const line of lines) {
    if (line.qty <= 0) continue
    const vi = resolveVariantIndex({ stock, variants }, line)
    const v = vi >= 0 ? variants[vi] : undefined
    if (hasOwnStock(v)) own.set(vi, (own.get(vi) ?? 0) + line.qty)
    else shared += line.qty
  }
  for (const [vi, qty] of own) {
    variants[vi] = { ...variants[vi], stock: Math.max(0, (variants[vi].stock as number) + sign * qty) }
  }
  if (stock !== null && shared > 0) stock = Math.max(0, stock + sign * shared)
  return { stock, variants }
}
