import { requireAdmin } from '@/lib/auth'
import { money } from '@/lib/money'
import { listSetProposals } from '@/lib/set-proposals'
import { SET_ENTITY_LABEL } from '@/lib/setovi'
import { DbError } from '@/components/admin/DbError'
import { SetProposalBoard, type SetProposalListItem } from '@/components/admin/SetProposalBoard'
import type { ProposalStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

function meta(row: Awaited<ReturnType<typeof listSetProposals>>[number]) {
  const bits = [money(row.priceCents)]
  if (row.separateCents != null) bits.push(`zasebno ${money(row.separateCents)}`)
  if (row.savingsCents != null) bits.push(row.savingsCents >= 0 ? `ušteda ${money(row.savingsCents)}` : `skuplje ${money(-row.savingsCents)}`)
  bits.push(`${row.items.length} futrola`)
  return bits.join(' · ')
}

export default async function AdminSetsPage() {
  await requireAdmin()
  try {
    const rows = await listSetProposals()
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
        <p className="text-sm text-mute">Prijedlozi setova. Prihvat otvara neobjavljeni proizvod koji možete urediti i objaviti.</p>
        <SetProposalBoard items={items} />
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
