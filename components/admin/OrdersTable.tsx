import Link from 'next/link'
import { Status, orderStage } from './Status'
import { money, formatDateTime } from '@/lib/money'
import type { Order } from '@/lib/types'

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="text-sm text-mute">Nema narudžbi.</p>
  return (
    <div className="divide-y divide-line border-y border-line">
      {orders.map((o) => (
        <Link key={o.id} href={`/admin/orders/${o.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-2 py-4 transition hover:bg-ink-2 sm:grid-cols-[5rem_1fr_8rem_auto]">
          <span className="font-mono text-sm">#{o.id}</span>
          <span className="order-3 col-span-2 text-sm sm:order-none sm:col-span-1">{o.name}<span className="ml-2 text-xs text-mute">{o.city} · {formatDateTime(o.createdAt)}</span></span>
          <span className="font-mono text-sm tabular-nums sm:text-right">{money(o.totalCents)}</span>
          <span className="justify-self-end"><Status s={orderStage(o)} /></span>
        </Link>
      ))}
    </div>
  )
}
