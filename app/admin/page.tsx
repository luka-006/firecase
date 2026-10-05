import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getSettingsFresh } from '@/lib/settings'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { DbError } from '@/components/admin/DbError'
import { money } from '@/lib/money'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  await requireAdmin()
  const s = await getSettingsFresh()
  let st = { todo: 0, ordered: 0, month: 0, monthCount: 0, fiscalPending: 0 }
  let recent: Order[] = []
  let monthOrders: Order[] = []
  let dbError: unknown = null
  try {
    const [r] = await sql<typeof st[]>`select
      (select count(*)::int from orders where status = 'paid' and supplier_order = '') as todo,
      (select count(*)::int from orders where status = 'paid' and supplier_order <> '') as ordered,
      (select coalesce(sum(total_cents), 0)::int from orders where status in ('paid','shipped','delivered') and paid_at >= date_trunc('month', now())) as month,
      (select count(*)::int from orders where status in ('paid','shipped','delivered') and paid_at >= date_trunc('month', now())) as month_count,
      (select count(*)::int from invoices where fiscal_status = 'pending') as fiscal_pending`
    st = r
    recent = [...(await sql<Order[]>`select * from orders where status <> 'pending' order by id desc limit 8`)]
    monthOrders = [...(await sql<Order[]>`select * from orders where status in ('paid','shipped','delivered') and paid_at >= date_trunc('month', now())`)]
  } catch (e) {
    dbError = e
  }
  // Zarada ovaj mjesec: samo stavke kojima je poznata nabavna cijena
  const profit = monthOrders.reduce((a, o) => a + o.totalCents - (Math.round(o.totalCents * 0.015) + 25) - o.items.reduce((b, i) => b + (i.costCents ?? 0) * i.qty, 0), 0)
  const missing = [
    !process.env.STRIPE_SECRET_KEY && 'Stripe (STRIPE_SECRET_KEY) – bez toga nema plaćanja',
    !process.env.STRIPE_WEBHOOK_SECRET && 'Stripe webhook (STRIPE_WEBHOOK_SECRET)',
    !process.env.SMTP_PASS && 'E-mail (SMTP_PASS) – kupci ne dobivaju potvrde',
    !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID && 'Vercel Blob – upload slika ne radi',
    !process.env.DEEPL_API_KEY && 'Automatski prijevod (DEEPL_API_KEY)',
    !s.fiscalEnabled && 'Fiskalizacija je isključena – obavezna prije prve prodaje',
    s.fiscalEnabled && s.fiscalEnv === 'test' && 'Fiskalizacija radi u TEST okruženju',
  ].filter(Boolean) as string[]

  const Card = ({ href, n, title, sub, hot }: { href: string; n: number; title: string; sub: string; hot?: boolean }) => (
    <Link href={href} className={`card group block p-5 transition hover:border-flame/60 ${hot && n ? 'border-flame/50' : ''}`}>
      <p className={`h-display text-5xl ${hot && n ? 'text-flame' : ''}`}>{n}</p>
      <p className="mt-3 font-medium">{title} <span className="text-mute transition group-hover:translate-x-1">→</span></p>
      <p className="mt-1 text-xs text-mute">{sub}</p>
    </Link>
  )

  return (
    <div className="space-y-10">
      <h1 className="h-display text-2xl">Pregled</h1>
      {dbError ? <DbError error={dbError} /> : null}
      {st.fiscalPending > 0 && (
        <Link href="/admin/invoices" className="block border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">{st.fiscalPending} račun(a) čeka fiskalizaciju →</Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card href="/admin/orders?status=todo" n={st.todo} title="Za naručiti" sub="Plaćeno, još nije naručeno na AliExpressu" hot />
        <Card href="/admin/orders?status=ordered" n={st.ordered} title="Čeka slanje" sub="Naručeno, upiši broj za praćenje" hot />
        <div className="card p-5">
          <p className="h-display text-3xl">{money(st.month)}</p>
          <p className="mt-3 font-medium">Promet ovaj mjesec</p>
          <p className="mt-1 text-xs text-mute">{st.monthCount} narudžbi</p>
        </div>
        <div className="card p-5">
          <p className="h-display text-3xl text-flame-2">{money(profit)}</p>
          <p className="mt-3 font-medium">Zarada (procjena)</p>
          <p className="mt-1 text-xs text-mute">Nakon Stripea i nabave</p>
        </div>
      </div>

      {missing.length > 0 && (
        <details className="card group/m">
          <summary className="flex items-center justify-between px-5 py-4 text-sm">
            <span><span className="mr-2 inline-block size-2 bg-amber-400" />Još nije postavljeno ({missing.length})</span>
            <span className="font-mono text-mute transition group-open/m:rotate-45">+</span>
          </summary>
          <ul className="space-y-2 border-t border-line p-5 text-sm text-bone/80">
            {missing.map((m) => <li key={m}>· {m}</li>)}
          </ul>
        </details>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Zadnje narudžbe</h2><Link href="/admin/orders" className="text-sm text-mute hover:text-bone">Sve →</Link></div>
        <OrdersTable orders={recent} />
      </section>
    </div>
  )
}
