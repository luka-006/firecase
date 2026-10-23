import 'server-only'
import { sql } from './db'
import { isDeletableProposalStatus } from './proposal-bucket'
import { getSettingsFresh } from './settings'
import type { Product, ProductProposal, Variant } from './types'

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/đ/g, 'd')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export async function getProposal(id: number) {
  const [row] = await sql<ProductProposal[]>`select * from product_proposals where id = ${id}`
  return row ?? null
}

export async function listProposals(status?: string) {
  if (status) {
    return sql<ProductProposal[]>`select * from product_proposals where status = ${status} order by updated_at desc`
  }
  return sql<ProductProposal[]>`select * from product_proposals order by updated_at desc`
}

export function proposalToProductDefaults(p: ProductProposal): Partial<Product> & { nameHr: string } {
  return {
    nameHr: p.nameHr,
    nameEn: p.nameEn,
    shortHr: p.shortHr,
    shortEn: p.shortEn,
    descHr: p.descHr,
    descEn: p.descEn,
    images: p.images,
    variants: p.variants,
    supplierUrl: p.supplierUrl,
    costCents: p.costCents,
    materialHr: p.materialHr,
    materialEn: p.materialEn,
    manufacturer: p.manufacturer,
    euResponsible: p.euResponsible,
    safetyHr: p.safetyHr,
    safetyEn: p.safetyEn,
    slug: slugify(p.nameHr || `prijedlog-${p.id}`),
    priceCents: 0,
    compareCents: null,
    stock: null,
    active: false,
    featured: false,
    sort: 0,
    sku: '',
    proposalId: p.id,
  }
}

async function insertDraftProduct(p: ProductProposal, slug: string) {
  const d = proposalToProductDefaults(p)
  const [row] = await sql<Product[]>`
    insert into products ${sql({
      slug,
      nameHr: d.nameHr,
      nameEn: d.nameEn ?? '',
      shortHr: d.shortHr ?? '',
      shortEn: d.shortEn ?? '',
      descHr: d.descHr ?? '',
      descEn: d.descEn ?? '',
      priceCents: 0,
      compareCents: null,
      images: sql.json(d.images ?? []),
      variants: sql.json((d.variants ?? []) as never),
      stock: null,
      active: false,
      featured: false,
      sort: 0,
      sku: '',
      materialHr: d.materialHr ?? '',
      materialEn: d.materialEn ?? '',
      manufacturer: d.manufacturer ?? '',
      euResponsible: d.euResponsible ?? '',
      safetyHr: d.safetyHr ?? '',
      safetyEn: d.safetyEn ?? '',
      supplierUrl: d.supplierUrl ?? '',
      costCents: d.costCents ?? null,
      proposalId: p.id,
    })} returning *`
  await sql`
    update product_proposals set status = 'accepted', product_id = ${row.id}, reject_reason = null, updated_at = now()
    where id = ${p.id}`
  return row
}

/** Neobjavljeni proizvod iz prijedloga (bez prodajne cijene). */
export async function createDraftProductFromProposal(p: ProductProposal) {
  if (p.productId) {
    const [existing] = await sql<Product[]>`select * from products where id = ${p.productId}`
    if (existing) {
      await sql`
        update product_proposals set status = 'accepted', product_id = ${existing.id}, reject_reason = null, updated_at = now()
        where id = ${p.id}`
      return existing
    }
  }
  const base = proposalToProductDefaults(p).slug || `prijedlog-${p.id}`
  try {
    return await insertDraftProduct(p, base)
  } catch (e) {
    if ((e as { code?: string }).code !== '23505') throw e
    return insertDraftProduct(p, `${base.slice(0, 68)}-${p.id}`.slice(0, 80))
  }
}

/**
 * Premještaj između Na čekanju / Prihvaćeno / Odbijeno.
 * Prihvat bez proizvoda i dalje otvara neobjavljeni proizvod.
 * Odbijanje i dalje traži razlog. Proizvod se ne briše kad status ode s prihvaćenog.
 */
export async function setProposalBucket(id: number, bucket: 'pending' | 'accepted' | 'rejected', reason?: string) {
  const p = await getProposal(id)
  if (!p) throw new Error('Prijedlog ne postoji.')

  if (bucket === 'rejected') {
    const why = (reason ?? '').trim().slice(0, 2000)
    if (!why) throw new Error('Upišite razlog odbijanja.')
    await sql`
      update product_proposals set status = 'rejected', reject_reason = ${why}, updated_at = now()
      where id = ${id}`
    return { status: 'rejected' as const, productId: p.productId, created: false }
  }

  if (bucket === 'pending') {
    if (p.status === 'draft' || p.status === 'review') {
      return { status: p.status, productId: p.productId, created: false }
    }
    await sql`
      update product_proposals set status = 'review', reject_reason = null, updated_at = now()
      where id = ${id}`
    return { status: 'review' as const, productId: p.productId, created: false }
  }

  if (p.productId) {
    const [existing] = await sql<Product[]>`select * from products where id = ${p.productId}`
    if (existing) {
      await sql`
        update product_proposals set status = 'accepted', reject_reason = null, updated_at = now()
        where id = ${id}`
      return { status: 'accepted' as const, productId: existing.id, created: false }
    }
  }

  const row = await createDraftProductFromProposal({ ...p, productId: null })
  return { status: 'accepted' as const, productId: row.id, created: true }
}

export type DeleteOpenProposalResult =
  | { ok: true; id: number }
  | { ok: false; error: 'invalid' | 'not_found' | 'locked' | 'linked' }

/**
 * Briše samo skicu ili pregled. Prihvaćene i odbijene ostaju.
 * Ako proizvod još pokazuje na prijedlog, brisanje se odbija da se proizvod ne dira
 * (proposal_id bi inače postao null). Slike ostaju URL-ovi na retku; blobovi se ne brišu,
 * isto kao staff deleteProposal.
 */
export async function deleteOpenProposal(id: number): Promise<DeleteOpenProposalResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'invalid' }
  const [deleted] = await sql<{ id: number }[]>`
    delete from product_proposals
    where id = ${id}
      and status in ('draft', 'review')
      and not exists (select 1 from products where proposal_id = ${id})
    returning id`
  if (deleted) return { ok: true, id: deleted.id }

  const [cur] = await sql<{ status: string }[]>`select status from product_proposals where id = ${id}`
  if (!cur) return { ok: false, error: 'not_found' }
  if (!isDeletableProposalStatus(cur.status)) return { ok: false, error: 'locked' }
  const [linked] = await sql<{ id: number }[]>`select id from products where proposal_id = ${id} limit 1`
  if (linked) return { ok: false, error: 'linked' }
  return { ok: false, error: 'locked' }
}

export async function maybeAutoAcceptProposal(proposalId: number) {
  const s = await getSettingsFresh()
  if (!s.autoAcceptProposals) return null
  const p = await getProposal(proposalId)
  if (!p || p.status !== 'review') return null
  return createDraftProductFromProposal(p)
}
