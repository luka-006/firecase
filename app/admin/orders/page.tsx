import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { StatusFilter } from '@/components/admin/AdminUi'
import { DbError } from '@/components/admin/DbError'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status = '' } = await searchParams
  let orders: Order[]
  let counts: Record<string, number> = {}
  try {
    const [c] = await sql<Record<string, number>[]>`select
      count(*) filter (where status = 'paid' and supplier_order = '')::int as todo,
      count(*) filter (where status = 'paid' and supplier_order <> '')::int as ordered,
      count(*) filter (where status = 'shipped')::int as shipped
      from orders`
    counts = c
    const where =
      status === 'todo' ? sql`status = 'paid' and supplier_order = ''`
      : status === 'ordered' ? sql`status = 'paid' and supplier_order <> ''`
      : status ? sql`status = ${status}`
      : sql`status <> 'pending'`
    orders = [...(await sql<Order[]>`select * from orders where ${where} order by id desc limit 200`)]
  } catch (e) {
    return <DbError error={e} />
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="h-display text-2xl">Narudžbe</h1>
        <StatusFilter options={[
          ['', 'Sve narudžbe'], ['todo', 'Za naručiti', counts.todo], ['ordered', 'Naručeno, čeka slanje', counts.ordered],
          ['shipped', 'Poslano', counts.shipped], ['delivered', 'Dostavljeno'], ['refunded', 'Vraćen novac'], ['cancelled', 'Otkazano'], ['pending', 'Nedovršene (nije plaćeno)'],
        ]} />
      </div>
      <OrdersTable orders={orders} />
    </div>
  )
}
