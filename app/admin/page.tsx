import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getSettingsFresh } from '@/lib/settings'
import { money } from '@/lib/money'
import { OrdersTable } from '@/components/admin/OrdersTable'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  await requireAdmin()
  const s = await getSettingsFresh()
  let stats = { toShip: 0, month: 0, monthCount: 0, fiscalPending: 0 }
  let recent: Order[] = []
  let dbError = ''
  try {
    const [r] = await sql<typeof stats[]>`select
      (select count(*)::int from orders where status = 'paid') as to_ship,
      (select coalesce(sum(total_cents), 0)::int from orders where status in ('paid','shipped','delivered') and paid_at >= date_trunc('month', now())) as month,
      (select count(*)::int from orders where status in ('paid','shipped','delivered') and paid_at >= date_trunc('month', now())) as month_count,
      (select count(*)::int from invoices where fiscal_status = 'pending') as fiscal_pending`
    stats = r
    recent = [...(await sql<Order[]>`select * from orders where status <> 'pending' order by id desc limit 10`)]
  } catch (e) {
    dbError = (e as Error).message
  }
  const warnings = [
    dbError && `Baza nije dostupna: ${dbError}`,
    !process.env.STRIPE_SECRET_KEY && 'STRIPE_SECRET_KEY nije postavljen – plaćanje ne radi.',
    !process.env.STRIPE_WEBHOOK_SECRET && 'STRIPE_WEBHOOK_SECRET nije postavljen – narudžbe se potvrđuju samo preko stranice zahvale.',
    !process.env.SMTP_PASS && 'SMTP_PASS nije postavljen – e-mailovi se ne šalju.',
    !process.env.BLOB_READ_WRITE_TOKEN && 'Vercel Blob nije spojen – upload slika ne radi.',
    !s.fiscalEnabled && 'Fiskalizacija je isključena. Kartična plaćanja moraju se fiskalizirati prije puštanja trgovine u rad.',
    s.fiscalEnabled && s.fiscalEnv === 'test' && 'Fiskalizacija radi u TEST okruženju – JIR-ovi nisu pravno valjani.',
    stats.fiscalPending > 0 && `${stats.fiscalPending} račun(a) čeka fiskalizaciju – provjeri Računi.`,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-10">
      <h1 className="h-display text-2xl">Pregled</h1>
      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => <li key={w} className="rounded-sm border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">{w}</li>)}
        </ul>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Za slanje', String(stats.toShip)], ['Promet ovaj mjesec', money(stats.month)], ['Narudžbe ovaj mjesec', String(stats.monthCount)]].map(([k, v]) => (
          <div key={k} className="card p-5"><p className="text-xs uppercase tracking-wider text-mute">{k}</p><p className="mt-2 text-2xl tabular-nums">{v}</p></div>
        ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Zadnje narudžbe</h2><Link href="/admin/orders" className="text-sm text-mute hover:text-bone">Sve →</Link></div>
        <OrdersTable orders={recent} />
      </section>
    </div>
  )
}
