import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getProposal, proposalToProductDefaults } from '@/lib/proposals'
import { sql } from '@/lib/db'
import { money } from '@/lib/money'
import { getProductsByIdsAll } from '@/lib/products'
import { quoteSet, SET_ADMIN_HREF, SET_ENTITY_ONE } from '@/lib/setovi'
import { ProductForm } from '@/components/admin/ProductForm'
import { deleteProduct } from '../../actions'
import type { Product } from '@/lib/types'
import { DbError } from '@/components/admin/DbError'

export const dynamic = 'force-dynamic'

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; proposal?: string }> }) {
  await requireAdmin()
  const { id } = await params
  const { saved, proposal: proposalParam } = await searchParams
  let p: Product | null = null
  let proposalId: number | null = null
  if (id !== 'new') {
    try {
      ;[p] = await sql<Product[]>`select * from products where id = ${Number(id) || 0}`
    } catch (e) {
      return <DbError error={e} />
    }
    if (!p) notFound()
  }
  let included: Awaited<ReturnType<typeof getProductsByIdsAll>> = []
  if (p?.kind === 'set' && p.setItems?.length) {
    included = await getProductsByIdsAll(p.setItems.map((item) => item.productId))
  }
  const setQuote = p?.kind === 'set'
    ? quoteSet(p.priceCents, (p.setItems ?? []).map((ref) => {
      const item = included.find((row) => row.id === ref.productId)
      return item ? { priceCents: item.priceCents, costCents: item.costCents ?? null } : { priceCents: 0, costCents: null, missing: true }
    }))
    : null
  let initial: ReturnType<typeof proposalToProductDefaults> | undefined
  if (id === 'new' && proposalParam) {
    const prop = await getProposal(Number(proposalParam))
    if (prop) {
      proposalId = prop.id
      initial = proposalToProductDefaults(prop)
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-sm text-mute hover:text-bone">← Proizvodi</Link>
          <h1 className="h-display text-2xl">{p ? p.nameHr : 'Novi proizvod'}</h1>
        </div>
        {p && <Link href={`/proizvod/${p.slug}`} target="_blank" className="text-sm text-mute hover:text-bone">Pogledaj na stranici ↗</Link>}
      </div>
      {saved && <p className="text-sm text-emerald-400">Proizvod je kreiran.</p>}
      {proposalId && <p className="text-sm text-flame-2">Podaci su prefilled iz prijedloga #{proposalId}. Upišite prodajnu cijenu prije objave.</p>}
      {p?.kind === 'set' && (
        <section className="card space-y-3 p-5 text-sm">
          <p>Ovo je {SET_ENTITY_ONE}. {p.freeShipping ? 'Dostava je besplatna.' : 'Dostava ide po cjeniku.'} {p.active ? 'Vidljiv je na stranici.' : 'Još nije objavljen.'}</p>
          {p.sizeMix ? <p>Veličine (J5/J6): {p.sizeMix}</p> : null}
          {setQuote?.separateCents != null && <p>Zasebno {money(setQuote.separateCents)} · ušteda {money(setQuote.savingsCents ?? 0)}</p>}
          <ul className="divide-y divide-line">
            {(p.setItems ?? []).map((ref, index) => {
              const item = included.find((row) => row.id === ref.productId)
              return (
                <li key={`${ref.productId}-${index}`} className="flex justify-between gap-3 py-2">
                  <span>{item ? item.nameHr : ref.slug}</span>
                  <span className="font-mono">{item ? money(item.priceCents) : '—'}</span>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-mute">Stara cijena je prethodna cijena seta. Kad je upisana, na stranici se pokazuje najniža cijena u zadnjih 30 dana. „Zasebno” se računa iz trenutnih cijena uključenih futrola.</p>
          {p.setProposalId ? <p><Link href={`${SET_ADMIN_HREF}/${p.setProposalId}`} className="link">Prijedlog #{p.setProposalId}</Link></p> : null}
        </section>
      )}
      <ProductForm p={p} proposalId={proposalId} initial={initial} />
      {p && (
        <form action={deleteProduct} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={p.id} />
          <button className="text-sm text-red-400 hover:text-red-300">Obriši proizvod trajno</button>
          <span className="ml-3 text-xs text-mute">(ili ga samo sakrij isključivanjem „Vidljiv na stranici”)</span>
        </form>
      )}
    </div>
  )
}
