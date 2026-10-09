import 'server-only'
import { sql } from './db'
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

/** Neobjavljeni proizvod iz prijedloga (bez prodajne cijene). */
export async function createDraftProductFromProposal(p: ProductProposal) {
  const d = proposalToProductDefaults(p)
  const [row] = await sql<Product[]>`
    insert into products ${sql({
      slug: d.slug!,
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
    update product_proposals set status = 'accepted', product_id = ${row.id}, updated_at = now()
    where id = ${p.id}`
  return row
}

export async function maybeAutoAcceptProposal(proposalId: number) {
  const s = await getSettingsFresh()
  if (!s.autoAcceptProposals) return null
  const p = await getProposal(proposalId)
  if (!p || p.status !== 'review') return null
  return createDraftProductFromProposal(p)
}
