import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { formatDateTime } from '@/lib/money'
import { DbError } from '@/components/admin/DbError'
import { DeleteReviewButton } from '@/components/admin/ReviewActions'
import { Stars } from '@/components/Stars'
import { moderateReview } from '../actions'
import type { Review } from '@/lib/types'

export const dynamic = 'force-dynamic'

const FILTERS = [
  ['pending', 'Na čekanju'],
  ['approved', 'Odobrene'],
  ['rejected', 'Odbijene'],
  ['all', 'Sve'],
] as const

type Filter = (typeof FILTERS)[number][0]

type Row = Review & { buyerEmail: string }

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin()
  const { status: raw = 'pending' } = await searchParams
  const status: Filter = FILTERS.some(([v]) => v === raw) ? (raw as Filter) : 'pending'

  try {
    const counts = await sql<{ status: string; n: number }[]>`select status, count(*)::int as n from reviews group by status`
    const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0
    const total = counts.reduce((a, c) => a + c.n, 0)
    const rows = status === 'all'
      ? await sql<Row[]>`
          select r.*, o.email as buyer_email from reviews r
          join orders o on o.id = r.order_id
          order by r.created_at desc limit 300`
      : await sql<Row[]>`
          select r.*, o.email as buyer_email from reviews r
          join orders o on o.id = r.order_id
          where r.status = ${status}
          order by r.created_at desc limit 300`

    return (
      <div className="space-y-6">
        <div>
          <h1 className="h-display text-2xl">Recenzije</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">Javno se vide samo odobrene. Kupac recenziju šalje preko poveznice iz narudžbe, bez računa.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([value, label]) => {
            const count = value === 'all' ? total : n(value)
            const active = status === value
            return (
              <Link key={value} href={value === 'pending' ? '/admin/reviews' : `/admin/reviews?status=${value}`} className={`px-3 py-2 text-sm ${active ? 'bg-ink-3 text-bone' : 'text-bone/60 hover:text-bone'}`}>
                {label} ({count})
              </Link>
            )
          })}
        </div>
        <ul className="card divide-y divide-line">
          {rows.length === 0 && <li className="p-5 text-sm text-mute">Nema recenzija.</li>}
          {rows.map((r) => (
            <li key={r.id} className="space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  {r.productId ? (
                    <Link href={`/admin/products/${r.productId}`} className="font-medium link">{r.productName || 'Proizvod'}</Link>
                  ) : (
                    <span className="font-medium">{r.productName || 'Proizvod'}</span>
                  )}
                  {r.variant ? <span className="text-mute"> ({r.variant})</span> : null}
                  <Link href={`/admin/orders/${r.orderId}`} className="ml-3 text-xs link">Narudžba #{r.orderId}</Link>
                </div>
                <span className="text-xs text-mute">{formatDateTime(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} />
              {r.body ? <p className="whitespace-pre-wrap break-words text-bone/85">{r.body}</p> : <p className="text-mute">Bez komentara.</p>}
              <p className="text-xs text-mute">{r.displayName} · {r.buyerEmail} · {r.locale === 'en' ? 'EN' : 'HR'}</p>
              <div className="flex flex-wrap items-center gap-2">
                <form action={moderateReview} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  {r.status !== 'approved' && <button name="op" value="approve" className="btn btn-sm">Odobri</button>}
                  {r.status !== 'rejected' && <button name="op" value="reject" className="btn-ghost btn-sm">Odbij</button>}
                </form>
                <DeleteReviewButton id={r.id} action={moderateReview} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
