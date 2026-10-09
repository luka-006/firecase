import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getProposal, proposalToProductDefaults } from '@/lib/proposals'
import { sql } from '@/lib/db'
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
