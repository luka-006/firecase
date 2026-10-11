import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getProposal } from '@/lib/proposals'
import { money } from '@/lib/money'
import { ActionForm } from '@/components/Ui'
import { acceptProposal, rejectProposal } from '../../actions'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

export default async function AdminProposalDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  try {
    const p = await getProposal(Number(id))
    if (!p) notFound()
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/prijedlozi" className="text-sm text-mute hover:text-bone">← Prijedlozi</Link>
          <h1 className="h-display text-2xl">{p.nameHr || `Prijedlog #${p.id}`}</h1>
          <span className="text-xs text-mute">#{p.id} · {p.status}</span>
        </div>

        {p.status === 'review' && (
          <div className="card flex flex-wrap gap-3 p-5">
            <form action={acceptProposal}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-sm">Prihvati (forma proizvoda)</button>
            </form>
            <ActionForm action={rejectProposal} submit="Odbij" className="flex flex-wrap items-end gap-3" danger>
              <input type="hidden" name="id" value={p.id} />
              <label className="block min-w-[280px] flex-1">
                <span className="label">Razlog odbijanja</span>
                <input name="reason" required className="input" placeholder="Kratko objašnjenje za staff" />
              </label>
            </ActionForm>
          </div>
        )}

        {p.productId && (
          <p className="text-sm">
            Povezani proizvod: <Link href={`/admin/products/${p.productId}`} className="link">#{p.productId}</Link>
          </p>
        )}
        {p.rejectReason && <p className="text-sm text-red-300">Razlog odbijanja: {p.rejectReason}</p>}

        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-wrap gap-3">
            {p.images.map((src) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative size-32 overflow-hidden rounded border border-line">
                <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
              </a>
            ))}
          </div>
          <p><b>Naziv EN:</b> {p.nameEn || '—'}</p>
          <p><b>Nabava:</b> {p.costCents != null ? money(p.costCents) : '—'}</p>
          <p className="md:col-span-2"><b>Dobavljač:</b>{' '}
            {p.supplierUrl ? <a href={p.supplierUrl} className="link" target="_blank" rel="noopener noreferrer">{p.supplierUrl}</a> : '—'}
          </p>
          <p><b>Dostava (HR):</b> {p.estDeliveryHr || '—'}</p>
          <p><b>Dostava (EN):</b> {p.estDeliveryEn || '—'}</p>
          <p><b>Težina / dimenzije:</b> {p.weightDims || '—'}</p>
          <p><b>Oznake:</b> {p.qualityTags?.length ? p.qualityTags.join(', ') : '—'}</p>
          <div className="md:col-span-2 whitespace-pre-wrap text-sm text-bone/90">{p.descHr}</div>
          <div className="md:col-span-2 whitespace-pre-wrap text-sm text-mute">{p.descEn}</div>
          <div className="md:col-span-2 whitespace-pre-wrap text-sm"><b>Bilješke:</b> {p.notes || '—'}</div>
          <div className="md:col-span-2 whitespace-pre-wrap text-sm"><b>Izvori:</b> {p.sources || '—'}</div>
        </section>
      </div>
    )
  } catch (e) {
    return <DbError error={e} />
  }
}
