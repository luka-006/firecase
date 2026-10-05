import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { money, formatDateTime } from '@/lib/money'
import { Status } from '@/components/admin/Status'
import { retryFiscal } from '../actions'
import type { Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Invoices({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireAdmin()
  const { year } = await searchParams
  const y = Number(year) || new Date().getFullYear()
  const list = await sql<Invoice[]>`select * from invoices where year = ${y} order by seq desc`
  const total = list.reduce((a, i) => a + i.totalCents, 0)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display text-2xl">Računi {y}</h1>
        <div className="flex gap-3 text-sm">
          <Link href={`/admin/invoices?year=${y - 1}`} className="text-mute hover:text-bone">← {y - 1}</Link>
          <Link href={`/admin/invoices?year=${y + 1}`} className="text-mute hover:text-bone">{y + 1} →</Link>
        </div>
      </div>
      <p className="text-sm text-mute">Ukupno izdano: <span className="text-bone">{money(total)}</span> ({list.length} računa). Za knjigu prometa (KPR) koristi ovaj popis.</p>
      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-2 text-left text-xs uppercase tracking-wider text-mute">
            <tr><th className="p-3">Broj</th><th className="p-3">Datum</th><th className="p-3">Kupac</th><th className="p-3">Plaćanje</th><th className="p-3">Iznos</th><th className="p-3">Fiskalizacija</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((i) => (
              <tr key={i.id}>
                <td className="p-3"><a href={`/api/invoice/${i.id}`} target="_blank" className="link">{i.stornoOf ? 'Storno ' : ''}{i.number}</a></td>
                <td className="p-3 text-mute">{formatDateTime(i.issuedAt)}</td>
                <td className="p-3"><Link href={`/admin/orders/${i.orderId}`} className="hover:text-flame-2">{i.data.buyer.name}</Link></td>
                <td className="p-3 text-mute">{i.data.paymentLabel} ({i.paymentCode})</td>
                <td className="p-3 tabular-nums">{money(i.totalCents)}</td>
                <td className="p-3">
                  <Status s={i.fiscalStatus} fiscal />
                  {i.fiscalStatus === 'pending' && (
                    <form action={retryFiscal} className="mt-1 inline-block pl-2"><input type="hidden" name="id" value={i.id} /><button className="text-xs text-flame-2 underline">ponovi</button></form>
                  )}
                  {i.jir && <span className="block font-mono text-[10px] text-mute">JIR {i.jir}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
