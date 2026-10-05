import Link from 'next/link'
import { Status } from './Status'
import { money, formatDateTime } from '@/lib/money'
import type { Order } from '@/lib/types'

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="text-sm text-mute">Nema narudžbi.</p>
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-ink-2 text-left text-xs uppercase tracking-wider text-mute">
          <tr><th className="p-3">#</th><th className="p-3">Datum</th><th className="p-3">Kupac</th><th className="p-3">Iznos</th><th className="p-3">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-ink-2">
              <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="link">#{o.id}</Link></td>
              <td className="p-3 text-mute">{formatDateTime(o.createdAt)}</td>
              <td className="p-3">{o.name}<span className="block text-xs text-mute">{o.city}, {o.country}</span></td>
              <td className="p-3 tabular-nums">{money(o.totalCents)}</td>
              <td className="p-3"><Status s={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
