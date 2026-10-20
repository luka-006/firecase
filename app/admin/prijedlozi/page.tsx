import { requireAdmin } from '@/lib/auth'
import { listProposals } from '@/lib/proposals'
import { DbError } from '@/components/admin/DbError'
import { ProposalBoard, type ProposalListItem } from '@/components/admin/ProposalBoard'
import type { ProposalStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminProposalsPage() {
  await requireAdmin()
  try {
    const rows = await listProposals()
    const items: ProposalListItem[] = rows.map((p) => ({
      id: p.id,
      nameHr: p.nameHr,
      status: p.status as ProposalStatus,
      qualityTags: Array.isArray(p.qualityTags) ? p.qualityTags : [],
      updatedLabel: new Date(p.updatedAt).toLocaleString('hr-HR'),
      productId: p.productId,
      rejectReason: p.rejectReason,
    }))
    return (
      <div className="space-y-6">
        <h1 className="h-display text-2xl">Prijedlozi proizvoda</h1>
        <ProposalBoard items={items} />
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
