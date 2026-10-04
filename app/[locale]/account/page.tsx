import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ActionForm, Field } from '@/components/Ui'
import { deleteAccount, logout, saveProfile } from '@/app/actions'
import { getUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { money, formatDateTime } from '@/lib/money'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import type { Order } from '@/lib/types'

export const metadata: Metadata = { title: 'Moj račun · Account', robots: { index: false } }

export default async function Account({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const user = await getUser()
  if (!user) redirect(href(locale, 'login'))
  const d = t(locale)
  const [[u], orders] = await Promise.all([
    sql<Record<string, string>[]>`select name, email, phone, address, city, postal, country from users where id = ${user.id}`,
    sql<(Order & { invoiceId: number | null })[]>`select o.*, (select min(i.id) from invoices i where i.order_id = o.id and i.storno_of is null) as invoice_id
      from orders o where o.user_id = ${user.id} and o.status <> 'pending' order by o.id desc limit 50`,
  ])
  if (!u) redirect(href(locale, 'login'))

  return (
    <div className="container-x pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h-display text-3xl">{d.account}</h1><p className="mt-2 text-sm text-mute">{u.email}</p></div>
        <div className="flex gap-2">
          <Link href={href(locale, 'favorites')} className="btn-ghost btn-sm">{d.favorites}</Link>
          <form action={logout}><input type="hidden" name="locale" value={locale} /><button className="btn-ghost btn-sm">{d.logout}</button></form>
        </div>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="h-display mb-5 text-lg">{d.myOrders}</h2>
          {orders.length === 0 ? <p className="text-mute">{d.noOrders}</p> : (
            <ul className="divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                  <Link href={href(locale, 'order', o.publicId)} className="hover:text-flame-2">#{o.id} · {formatDateTime(o.createdAt, locale)}</Link>
                  <span className="text-mute">{d.status[o.status]}</span>
                  <span className="tabular-nums">{money(o.totalCents, locale)}</span>
                  {o.invoiceId && <a href={`/api/invoice/${o.invoiceId}?t=${o.publicId}`} className="link text-xs">PDF</a>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-10">
          <div>
            <h2 className="h-display mb-5 text-lg">{d.myDetails}</h2>
            <ActionForm action={saveProfile} submit={d.save} locale={locale}>
              <Field label={d.name} name="name" defaultValue={u.name} autoComplete="name" />
              <Field label={d.phone} name="phone" defaultValue={u.phone} autoComplete="tel" />
              <Field label={d.address} name="address" defaultValue={u.address} autoComplete="street-address" />
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <Field label={d.postal} name="postal" defaultValue={u.postal} autoComplete="postal-code" />
                <Field label={d.city} name="city" defaultValue={u.city} autoComplete="address-level2" />
              </div>
              <input type="hidden" name="country" value={u.country || 'HR'} />
            </ActionForm>
          </div>
          <details className="card p-5">
            <summary className="text-sm text-mute">{d.deleteAccount}</summary>
            <p className="my-4 text-xs text-mute">{d.deleteWarn}</p>
            <ActionForm action={deleteAccount} submit={d.deleteAccount} locale={locale} danger />
          </details>
        </section>
      </div>
    </div>
  )
}
