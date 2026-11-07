import 'server-only'
import { sql } from './db'
import { isDeletableProposalStatus } from './proposal-bucket'
import { getSettingsFresh } from './settings'
import { isPendingSetProposalStatus, quoteSet, type SetItemRef } from './setovi'
import type { Product, ProposalStatus } from './types'

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

export type SetProposal = {
  id: number
  status: ProposalStatus
  nameHr: string
  shortHr: string
  images: string[]
  items: SetItemRef[]
  priceCents: number
  freeShipping: boolean
  sizeMix: string
  notes: string
  rejectReason: string | null
  productId: number | null
  createdAt: Date
  updatedAt: Date
}

export type ResolvedSetItem = SetItemRef & {
  nameHr: string
  image: string | null
  priceCents: number | null
  costCents: number | null
  missing: boolean
}

export type SetProposalView = SetProposal & {
  resolved: ResolvedSetItem[]
  separateCents: number | null
  savingsCents: number | null
  costCents: number | null
  marginCents: number | null
  complete: boolean
}

function asRefs(value: unknown): SetItemRef[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as { productId?: unknown; slug?: unknown }
    const productId = Number(row.productId)
    const slug = typeof row.slug === 'string' ? row.slug : ''
    if (!Number.isInteger(productId) || productId <= 0 || !slug) return []
    return [{ productId, slug }]
  })
}

function normalize(row: SetProposal): SetProposal {
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    items: asRefs(row.items),
    freeShipping: row.freeShipping !== false,
    sizeMix: row.sizeMix ?? '',
    notes: row.notes ?? '',
    priceCents: row.priceCents ?? 0,
  }
}

async function productsFor(ids: number[]) {
  if (!ids.length) return []
  return [...(await sql<Product[]>`select * from products where id in ${sql(ids)}`)]
}

function present(row: SetProposal, products: Product[]): SetProposalView {
  const proposal = normalize(row)
  const resolved: ResolvedSetItem[] = proposal.items.map((ref) => {
    const product = products.find((item) => item.id === ref.productId)
    if (!product) {
      return { ...ref, nameHr: ref.slug, image: null, priceCents: null, costCents: null, missing: true }
    }
    return {
      productId: product.id,
      slug: product.slug,
      nameHr: product.nameHr,
      image: product.images?.[0] ?? null,
      priceCents: product.priceCents,
      costCents: product.costCents ?? null,
      missing: false,
    }
  })
  const quote = quoteSet(proposal.priceCents, resolved.map((item) => ({
    priceCents: item.priceCents ?? 0,
    costCents: item.costCents,
    missing: item.missing,
  })))
  return { ...proposal, resolved, ...quote }
}

export async function presentSetProposals(rows: SetProposal[]) {
  const ids = [...new Set(rows.flatMap((row) => asRefs(row.items).map((item) => item.productId)))]
  const products = await productsFor(ids)
  return rows.map((row) => present(row, products))
}

export async function presentSetProposal(row: SetProposal) {
  const [view] = await presentSetProposals([row])
  return view
}

export async function listSetProposals(status?: string) {
  const rows = status
    ? await sql<SetProposal[]>`select * from set_proposals where status = ${status} order by updated_at desc`
    : await sql<SetProposal[]>`select * from set_proposals order by updated_at desc`
  return presentSetProposals(rows)
}

export async function getSetProposal(id: number) {
  const [row] = await sql<SetProposal[]>`select * from set_proposals where id = ${id}`
  return row ? present(row, await productsFor(asRefs(row.items).map((item) => item.productId))) : null
}

export async function resolveSetItems(input: { productId?: number; slug?: string }[]) {
  const ids = [...new Set(input.map((item) => item.productId).filter((id): id is number => !!id))]
  const slugs = [...new Set(input.map((item) => item.slug?.trim()).filter((slug): slug is string => !!slug))]
  const byId = ids.length
    ? await sql<{ id: number; slug: string }[]>`select id, slug from products where id in ${sql(ids)}`
    : []
  const bySlug = slugs.length
    ? await sql<{ id: number; slug: string }[]>`select id, slug from products where slug in ${sql(slugs)}`
    : []
  const missing: string[] = []
  const items: SetItemRef[] = []
  for (const raw of input) {
    const slug = raw.slug?.trim()
    const idRow = raw.productId ? byId.find((row) => row.id === raw.productId) : undefined
    const slugRow = slug ? bySlug.find((row) => row.slug === slug) : undefined
    if (raw.productId && !idRow) missing.push(String(raw.productId))
    if (slug && !slugRow) missing.push(slug)
    if (idRow && slugRow && idRow.id !== slugRow.id) missing.push(`${raw.productId}/${slug}`)
    const row = idRow ?? slugRow
    if (row) items.push({ productId: row.id, slug: row.slug })
  }
  if (missing.length || items.length !== input.length) return { ok: false as const, missing }
  return { ok: true as const, items }
}

async function insertDraftSet(proposal: SetProposalView, slug: string) {
  const parts = proposal.resolved.filter((item) => !item.missing)
  if (parts.length !== proposal.items.length) throw new Error('Neke uključene futrole više ne postoje.')
  const names = parts.map((item) => item.nameHr).filter(Boolean)
  const desc = [proposal.shortHr, names.length ? `U setu: ${names.join(', ')}.` : '', proposal.sizeMix ? `Veličine: ${proposal.sizeMix}` : '']
    .filter(Boolean)
    .join('\n\n')
  const [row] = await sql<Product[]>`
    insert into products ${sql({
      slug,
      nameHr: proposal.nameHr,
      nameEn: '',
      shortHr: proposal.shortHr,
      shortEn: '',
      descHr: desc,
      descEn: '',
      priceCents: proposal.priceCents,
      compareCents: null,
      images: sql.json(proposal.images),
      variants: sql.json([]),
      stock: null,
      active: false,
      featured: false,
      sort: 0,
      sku: '',
      materialHr: '',
      materialEn: '',
      manufacturer: '',
      euResponsible: '',
      safetyHr: '',
      safetyEn: '',
      supplierUrl: '',
      costCents: proposal.costCents,
      kind: 'set',
      setItems: sql.json(proposal.items),
      freeShipping: proposal.freeShipping,
      sizeMix: proposal.sizeMix,
      setProposalId: proposal.id,
    })} returning *`
  await sql`insert into price_history (product_id, price_cents) values (${row.id}, ${proposal.priceCents})`
  await sql`
    update set_proposals set status = 'accepted', product_id = ${row.id}, reject_reason = null, updated_at = now()
    where id = ${proposal.id}`
  return row
}

export async function createDraftSetFromProposal(proposal: SetProposalView) {
  if (proposal.productId) {
    const [existing] = await sql<Product[]>`select * from products where id = ${proposal.productId}`
    if (existing) {
      await sql`
        update set_proposals set status = 'accepted', product_id = ${existing.id}, reject_reason = null, updated_at = now()
        where id = ${proposal.id}`
      return existing
    }
  }
  const base = slugify(proposal.nameHr || `set-${proposal.id}`) || `set-${proposal.id}`
  try {
    return await insertDraftSet(proposal, base)
  } catch (e) {
    if ((e as { code?: string }).code !== '23505') throw e
    return insertDraftSet(proposal, `${base.slice(0, 68)}-${proposal.id}`.slice(0, 80))
  }
}

export async function setSetProposalBucket(id: number, bucket: 'pending' | 'accepted' | 'rejected', reason?: string) {
  const proposal = await getSetProposal(id)
  if (!proposal) throw new Error('Prijedlog ne postoji.')

  if (bucket === 'rejected') {
    const why = (reason ?? '').trim().slice(0, 2000)
    await sql`
      update set_proposals set status = 'rejected', reject_reason = ${why || null}, updated_at = now()
      where id = ${id}`
    return { status: 'rejected' as const, productId: proposal.productId, created: false }
  }

  if (bucket === 'pending') {
    if (proposal.status === 'draft' || proposal.status === 'review') {
      return { status: proposal.status, productId: proposal.productId, created: false }
    }
    await sql`
      update set_proposals set status = 'review', reject_reason = null, updated_at = now()
      where id = ${id}`
    return { status: 'review' as const, productId: proposal.productId, created: false }
  }

  if (proposal.productId) {
    const [existing] = await sql<Product[]>`select * from products where id = ${proposal.productId}`
    if (existing) {
      await sql`
        update set_proposals set status = 'accepted', reject_reason = null, updated_at = now()
        where id = ${id}`
      return { status: 'accepted' as const, productId: existing.id, created: false }
    }
  }

  const row = await createDraftSetFromProposal({ ...proposal, productId: null })
  return { status: 'accepted' as const, productId: row.id, created: true }
}

export async function deleteOpenSetProposal(id: number) {
  if (!Number.isInteger(id) || id <= 0) return { ok: false as const, error: 'invalid' as const }
  const [deleted] = await sql<{ id: number }[]>`
    delete from set_proposals
    where id = ${id}
      and status in ('draft', 'review')
      and not exists (select 1 from products where set_proposal_id = ${id})
    returning id`
  if (deleted) return { ok: true as const, id: deleted.id }
  const [cur] = await sql<{ status: string }[]>`select status from set_proposals where id = ${id}`
  if (!cur) return { ok: false as const, error: 'not_found' as const }
  if (!isDeletableProposalStatus(cur.status)) return { ok: false as const, error: 'locked' as const }
  const [linked] = await sql<{ id: number }[]>`select id from products where set_proposal_id = ${id} limit 1`
  if (linked) return { ok: false as const, error: 'linked' as const }
  return { ok: false as const, error: 'locked' as const }
}

/**
 * Replaces images on a draft or review proposal. No other column is written,
 * and the linked product (if one already exists) is left untouched.
 */
export async function replacePendingSetProposalImages(id: number, images: string[]) {
  if (!Number.isInteger(id) || id <= 0) return { ok: false as const, error: 'invalid' as const }
  const [updated] = await sql<SetProposal[]>`
    update set_proposals
    set images = ${sql.json(images)}, updated_at = now()
    where id = ${id} and status in ('draft', 'review')
    returning *`
  if (updated) return { ok: true as const, proposal: normalize(updated) }
  const [cur] = await sql<{ id: number; status: string }[]>`select id, status from set_proposals where id = ${id}`
  if (!cur) return { ok: false as const, error: 'not_found' as const }
  if (!isPendingSetProposalStatus(cur.status)) return { ok: false as const, error: 'not_pending' as const }
  return { ok: false as const, error: 'not_pending' as const }
}

export async function maybeAutoAcceptSetProposal(proposalId: number) {
  const settings = await getSettingsFresh()
  if (!settings.autoAcceptProposals) return null
  const proposal = await getSetProposal(proposalId)
  if (!proposal || proposal.status !== 'review') return null
  return createDraftSetFromProposal(proposal)
}
