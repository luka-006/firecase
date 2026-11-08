import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { money } from '@/lib/money'
import { listInactiveAcceptedSets, listSetProposals } from '@/lib/set-proposals'
import { SET_ENTITY_LABEL } from '@/lib/setovi'
import { DbError } from '@/components/admin/DbError'
import { SetProposalBoard, type SetProposalListItem } from '@/components/admin/SetProposalBoard'
import { publishAcceptedSetsNow } from '../actions'
import type { ProposalStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

function meta(row: Awaited<ReturnType<typeof listSetProposals>>[number]) {
  const bits = [money(row.priceCents)]
  if (row.separateCents != null) bits.push(`zasebno ${money(row.separateCents)}`)
  if (row.savingsCents != null) bits.push(row.savingsCents >= 0 ? `ušteda ${money(row.savingsCents)}` : `skuplje ${money(-row.savingsCents)}`)
  bits.push(`${row.items.length} futrola`)
  return bits.join(' · ')
}

export default async function AdminSetsPage({ searchParams }: { searchParams: Promise<{ published?: string }> }) {
  await requireAdmin()
  const { published } = await searchParams
  try {
    const [rows, hidden] = await Promise.all([listSetProposals(), listInactiveAcceptedSets()])
    const items: SetProposalListItem[] = rows.map((row) => ({
      id: row.id,
      nameHr: row.nameHr,
      status: row.status as ProposalStatus,
      updatedLabel: new Date(row.updatedAt).toLocaleString('hr-HR'),
      productId: row.productId,
      rejectReason: row.rejectReason,
      meta: meta(row),
    }))
    return (
      <div className="space-y-6">
        <h1 className="h-display text-2xl">{SET_ENTITY_LABEL}</h1>
        <p className="text-sm text-mute">Prihvat objavljuje set na stranici i otvara postojeći obrazac za uređivanje. Skice, na čekanju i odbijeni se ne prikazuju kupcima.</p>
        {published != null && <p className="text-sm text-emerald-300">Objavljeno setova: {Number(published) || 0}. Cijene, slike, sadržaj i dostava nisu dirani.</p>}
        {hidden.length > 0 && (
          <form action={publishAcceptedSetsNow} className="card space-y-3 p-4">
            <p className="text-sm">Prihvaćeni setovi koji još nisu na stranici:</p>
            <ul className="space-y-2 text-sm">
              {hidden.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span>{row.nameHr} · {money(row.priceCents)} · <span className="text-mute">{row.slug}</span></span>
                  <Link href={`/admin/products/${row.id}`} className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Uredi set</Link>
                </li>
              ))}
            </ul>
            <button className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Objavi ove setove</button>
            <p className="text-xs text-mute">Mijenja se samo vidljivost ovih setova. Skice, na čekanju, odbijeni i obične futrole ostaju kakvi jesu.</p>
          </form>
        )}
        <SetProposalBoard items={items} />
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
