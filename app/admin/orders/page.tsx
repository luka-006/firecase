import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { OrdersTable } from '@/components/admin/OrdersTable'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'
const FILTERS = [['', 'Sve'], ['paid', 'Za slanje'], ['shipped', 'Poslano'], ['delivered', 'Dostavljeno'], ['refunded', 'Vraćeno'], ['pending', 'Nedovršene'], ['cancelled', 'Otkazano']]

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status = '' } = await searchParams
  const orders = status
    ? await sql<Order[]>`select * from orders where status = ${status} order by id desc limit 200`
    : await sql<Order[]>`select * from orders where status <> 'pending' order by id desc limit 200`
  return (
    <div className="space-y-6">
      <h1 className="h-display text-2xl">Narudžbe</h1>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <Link key={k} href={k ? `/admin/orders?status=${k}` : '/admin/orders'}
            className={`rounded-full border px-3 py-1.5 text-xs ${status === k ? 'border-bone bg-bone text-ink' : 'border-line text-mute hover:text-bone'}`}>{l}</Link>
        ))}
      </div>
      <OrdersTable orders={[...orders]} />
    </div>
  )
}
