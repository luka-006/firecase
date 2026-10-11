import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { sql } from '@/lib/db'
import type { ProductProposal } from '@/lib/types'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  draft: 'Skica',
  review: 'Za pregled',
  rejected: 'Odbijeno',
  accepted: 'Prihvaćeno',
}

export default async function StaffProposalsPage() {
  await requireStaff()
  let rows: ProductProposal[] = []
  try {
    rows = [...(await sql<ProductProposal[]>`select * from product_proposals order by updated_at desc`)]
  } catch (e) {
    return <DbError error={e} />
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Prijedlozi proizvoda</h1>
        <Link href="/staff/proposals/new" className="btn btn-sm">Novi prijedlog</Link>
      </div>
      <ul className="card divide-y divide-line">
        {rows.length === 0 && <li className="p-5 text-sm text-mute">Još nema prijedloga.</li>}
        {rows.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <Link href={`/staff/proposals/${p.id}`} className="font-medium link">{p.nameHr || `#${p.id}`}</Link>
              <span className="ml-2 text-mute">{STATUS[p.status] ?? p.status}</span>
            </div>
            <span className="text-xs text-mute">{new Date(p.updatedAt).toLocaleString('hr-HR')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
