import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ProposalForm } from '@/components/staff/ProposalForm'
import { deleteProposal } from '@/app/staff/actions'
import type { ProductProposal } from '@/lib/types'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

export default async function StaffProposalEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params
  if (id === 'new') {
    return (
      <div className="space-y-6">
        <Link href="/staff/proposals" className="text-sm text-mute hover:text-bone">← Prijedlozi</Link>
        <h1 className="h-display text-2xl">Novi prijedlog</h1>
        <ProposalForm p={null} />
      </div>
    )
  }
  let p: ProductProposal | undefined
  try {
    ;[p] = await sql<ProductProposal[]>`select * from product_proposals where id = ${Number(id) || 0}`
  } catch (e) {
    return <DbError error={e} />
  }
  if (!p) notFound()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/staff/proposals" className="text-sm text-mute hover:text-bone">← Prijedlozi</Link>
          <h1 className="h-display text-2xl">{p.nameHr || `Prijedlog #${p.id}`}</h1>
        </div>
        {p.status !== 'accepted' && (
          <form action={deleteProposal}>
            <input type="hidden" name="id" value={p.id} />
            <button className="text-sm text-red-400">Obriši</button>
          </form>
        )}
      </div>
      <ProposalForm p={p} />
    </div>
  )
}
