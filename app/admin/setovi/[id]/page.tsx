import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { money } from '@/lib/money'
import { PROPOSAL_STATUS_LABEL } from '@/lib/proposal-bucket'
import { getSetProposal } from '@/lib/set-proposals'
import { SET_ADMIN_HREF, SET_ENTITY_LABEL, SET_ENTITY_ONE } from '@/lib/setovi'
import { ActionForm } from '@/components/Ui'
import { DbError } from '@/components/admin/DbError'
import { acceptSetProposal, publishAcceptedSetNow, rejectSetProposal, returnSetProposalToPending } from '../../actions'

export const dynamic = 'force-dynamic'

function euros(cents: number | null) {
  return cents == null ? '—' : money(cents)
}

export default async function AdminSetDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  try {
    const proposal = await getSetProposal(Number(id))
    if (!proposal) notFound()
    const [linked] = proposal.productId
      ? await sql<{ active: boolean; slug: string; priceCents: number }[]>`select active, slug, price_cents from products where id = ${proposal.productId}`
      : []
    const margin = proposal.marginCents != null && proposal.priceCents > 0
      ? `${money(proposal.marginCents)} (${Math.round(proposal.marginCents / proposal.priceCents * 100)}%)`
      : '—'
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={SET_ADMIN_HREF} className="text-sm text-mute hover:text-bone">← {SET_ENTITY_LABEL}</Link>
          <h1 className="h-display text-2xl">{proposal.nameHr || `${SET_ENTITY_ONE} #${proposal.id}`}</h1>
          <span className="text-xs text-mute">#{proposal.id} · {PROPOSAL_STATUS_LABEL[proposal.status] ?? proposal.status}</span>
        </div>

        <div className="card flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {proposal.status !== 'accepted' && (
              <form action={acceptSetProposal}>
                <input type="hidden" name="id" value={proposal.id} />
                <button className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Prihvati</button>
              </form>
            )}
            {proposal.status !== 'review' && proposal.status !== 'draft' && (
              <form action={returnSetProposalToPending}>
                <input type="hidden" name="id" value={proposal.id} />
                <button className="btn-ghost btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Na čekanju</button>
              </form>
            )}
          </div>
          {proposal.status !== 'rejected' && (
            <ActionForm action={rejectSetProposal} submit="Odbij" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" danger>
              <input type="hidden" name="id" value={proposal.id} />
              <label className="block w-full min-w-0 sm:min-w-64 sm:flex-1">
                <span className="label">Komentar (neobavezno)</span>
                <input name="reason" className="input text-base" style={{ fontSize: 16 }} placeholder="Komentar (neobavezno)" />
              </label>
            </ActionForm>
          )}
        </div>

        {proposal.productId && (
          <div className="card flex flex-col gap-3 p-5">
            <p className="text-sm">
              {linked?.active ? 'Set je vidljiv na stranici.' : 'Set još nije vidljiv na stranici.'}
              {linked?.slug ? <span className="mt-1 block text-xs text-mute">URL: {linked.slug}</span> : null}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/admin/products/${proposal.productId}`} className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Uredi set</Link>
              {proposal.status === 'accepted' && linked && !linked.active && linked.priceCents > 0 && (
                <form action={publishAcceptedSetNow}>
                  <input type="hidden" name="id" value={proposal.id} />
                  <input type="hidden" name="productId" value={proposal.productId} />
                  <button className="btn-ghost btn-sm min-h-11 w-full touch-manipulation sm:w-auto">Objavi na stranici</button>
                </form>
              )}
            </div>
          </div>
        )}
        {proposal.rejectReason && <p className="text-sm text-red-300">Komentar: {proposal.rejectReason}</p>}

        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-wrap gap-3">
            {proposal.images.map((src) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative size-32 overflow-hidden rounded border border-line">
                <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
              </a>
            ))}
          </div>
          <p className="md:col-span-2 whitespace-pre-wrap text-sm text-bone/90">{proposal.shortHr}</p>
          <p><b>Predložena cijena:</b> {money(proposal.priceCents)}</p>
          <p><b>Zasebno:</b> {euros(proposal.separateCents)}</p>
          <p><b>Ušteda:</b> {euros(proposal.savingsCents)}</p>
          <p><b>Nabava:</b> {euros(proposal.costCents)}{proposal.costCents == null ? ' (nije upisana na svim futrolama)' : ''}</p>
          <p><b>Marža:</b> {margin}</p>
          <p><b>Dostava:</b> {proposal.freeShipping ? 'Besplatna' : 'Po cjeniku'}</p>
          <p className="md:col-span-2"><b>Veličine (J5/J6):</b> {proposal.sizeMix || '—'}</p>
          <div className="md:col-span-2 whitespace-pre-wrap text-sm"><b>Bilješke:</b> {proposal.notes || '—'}</div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-medium">Uključene futrole</h2>
          <ul className="divide-y divide-line">
            {proposal.resolved.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex items-center gap-3 py-3 text-sm">
                <span className="relative size-14 shrink-0 overflow-hidden rounded border border-line bg-ink-3">
                  {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-cover" unoptimized />}
                </span>
                <span className="min-w-0 flex-1">
                  {item.missing ? (
                    <span className="text-red-300">{item.slug} nije pronađen</span>
                  ) : (
                    <Link href={`/admin/products/${item.productId}`} className="link">{item.nameHr}</Link>
                  )}
                  <span className="mt-0.5 block text-xs text-mute">{item.slug}</span>
                </span>
                <span className="font-mono tabular-nums">{item.priceCents == null ? '—' : money(item.priceCents)}</span>
              </li>
            ))}
          </ul>
          {!proposal.complete && <p className="mt-3 text-xs text-amber-300">Zasebna cijena čeka da sve futrole postoje u katalogu.</p>}
        </section>
      </div>
    )
  } catch (e) {
    if (typeof (e as { digest?: string }).digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_')) throw e
    return <DbError error={e} />
  }
}
