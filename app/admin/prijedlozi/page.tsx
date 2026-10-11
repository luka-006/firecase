import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { listProposals } from '@/lib/proposals'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  draft: 'Skica',
  review: 'Za pregled',
  rejected: 'Odbijeno',
  accepted: 'Prihvaćeno',
}

export default async function AdminProposalsPage() {
  await requireAdmin()
  try {
    const rows = await listProposals()
    return (
      <div className="space-y-6">
        <h1 className="h-display text-2xl">Prijedlozi proizvoda</h1>
        <ul className="card divide-y divide-line">
          {rows.length === 0 && <li className="p-5 text-sm text-mute">Nema prijedloga.</li>}
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <Link href={`/admin/prijedlozi/${p.id}`} className="font-medium link">{p.nameHr || `#${p.id}`}</Link>
                <span className="ml-2 rounded bg-ink-3 px-2 py-0.5 text-xs text-mute">{STATUS[p.status] ?? p.status}</span>
                {p.qualityTags?.length ? <span className="ml-2 text-xs text-mute">{p.qualityTags.join(' · ')}</span> : null}
              </div>
              <span className="text-xs text-mute">{new Date(p.updatedAt).toLocaleString('hr-HR')}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
