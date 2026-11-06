import type { OrderComponent, OrderItem, Product } from './types'
import type { SetItemRef } from './setovi'
import { isSoldOut, type Stocked } from './stock'
import { resolveSupplierLine, type SupplierLine } from './supplier-order'

/** A set cannot be bought when one of its cases is gone. */
export function setPartsBlocked(parts: Stocked[]) {
  return parts.some((part) => isSoldOut(part))
}

export type SupplierViewLine = SupplierLine & { cost: number | null }

/** Sets expand into one supplier line per included case, each with that case's AE link. */
export function supplierViewLines(
  items: OrderItem[],
  products: Pick<Product, 'id' | 'supplierUrl' | 'variants' | 'costCents'>[],
): SupplierViewLine[] {
  const out: SupplierViewLine[] = []
  for (const item of items) {
    if (item.components?.length) {
      for (const part of item.components) {
        const product = products.find((row) => row.id === part.productId) ?? null
        const qty = item.qty * (part.qty > 0 ? part.qty : 1)
        const line = resolveSupplierLine({
          productId: part.productId,
          slug: part.slug,
          name: `${item.name}: ${part.name}`,
          variant: part.variant ?? '',
          variantIndex: part.variantIndex,
          qty,
          unitCents: part.unitCents,
          image: part.image,
          supplierUrl: part.supplierUrl,
          supplierOption: part.supplierOption,
          supplierSku: part.supplierSku,
          supplierNote: part.supplierNote,
          costCents: part.costCents,
        }, product)
        out.push({ ...line, qty, cost: part.costCents ?? product?.costCents ?? null })
      }
      continue
    }
    const product = products.find((row) => row.id === item.productId) ?? null
    const line = resolveSupplierLine(item, product)
    out.push({ ...line, cost: item.costCents ?? product?.costCents ?? null })
  }
  return out
}

export function componentSnapshots(
  refs: SetItemRef[],
  products: Product[],
  locale: 'hr' | 'en',
): { ok: true; components: OrderComponent[] } | { ok: false } {
  const components: OrderComponent[] = []
  for (const ref of refs) {
    const product = products.find((row) => row.id === ref.productId)
    if (!product || isSoldOut(product)) return { ok: false }
    const only = product.variants.length === 1 ? product.variants[0] : undefined
    components.push({
      productId: product.id,
      slug: product.slug,
      name: locale === 'en' && product.nameEn ? product.nameEn : product.nameHr,
      qty: 1,
      image: product.images[0],
      unitCents: product.priceCents,
      supplierUrl: product.supplierUrl || '',
      supplierOption: only?.sup ?? '',
      supplierSku: only?.supplierSku ?? '',
      supplierNote: only?.supplierNote ?? '',
      costCents: product.costCents ?? null,
      variant: only ? (locale === 'en' && only.en ? only.en : only.hr) : '',
      variantIndex: only ? 0 : undefined,
    })
  }
  return { ok: true, components }
}
