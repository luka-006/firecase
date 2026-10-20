import 'server-only'
import { revalidateTag } from 'next/cache'
import { sql } from './db'
import { moveStock, type StockLine } from './stock'
import type { Order, Variant } from './types'

/** Takes stock when an order is paid, and puts it back on storno or cancel. Idempotent via orders.stock_adjusted. */
export async function adjustOrderStock(orderId: number, direction: 'take' | 'give') {
  const changed = await sql.begin(async (tx) => {
    const [claim] = direction === 'take'
      ? await tx<{ id: number }[]>`update orders set stock_adjusted = true where id = ${orderId} and stock_adjusted = false returning id`
      : await tx<{ id: number }[]>`update orders set stock_adjusted = false where id = ${orderId} and stock_adjusted = true returning id`
    if (!claim) return false
    const [order] = await tx<Pick<Order, 'items'>[]>`select items from orders where id = ${orderId}`
    if (!order) return false
    const ids = [...new Set(order.items.map((item) => item.productId))]
    for (const id of ids) {
      const [row] = await tx<{ stock: number | null; variants: Variant[] }[]>`
        select stock, variants from products where id = ${id} for update`
      if (!row) continue
      const lines: StockLine[] = order.items
        .filter((item) => item.productId === id)
        .map((item) => ({ qty: item.qty, variant: item.variant, variantIndex: item.variantIndex }))
      const next = moveStock({ stock: row.stock, variants: row.variants ?? [] }, lines, direction === 'take' ? -1 : 1)
      await tx`update products set stock = ${next.stock}, variants = ${sql.json(next.variants as never)}, updated_at = now() where id = ${id}`
    }
    return true
  })
  if (changed) revalidateTag('products', 'max')
}
