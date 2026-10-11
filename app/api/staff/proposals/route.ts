import { z } from 'zod'
import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import { maybeAutoAcceptProposal } from '@/lib/proposals'
import { proposalCreateSchema, proposalPatchSchema } from '@/lib/staff/proposal-schema'
import type { ProductProposal } from '@/lib/types'

export const runtime = 'nodejs'

function normalizeVariants(v: { hr: string; en?: string; sup?: string }[]) {
  return v.map(({ hr, en, sup }) => (sup ? { hr, en: en || hr, sup } : { hr, en: en || hr }))
}

export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const rows = status
    ? await sql<ProductProposal[]>`select * from product_proposals where status = ${status} order by updated_at desc`
    : await sql<ProductProposal[]>`select * from product_proposals order by updated_at desc`
  return Response.json({ proposals: rows })
}

export async function POST(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = proposalCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  const status = d.status === 'review' ? 'review' : 'draft'
  const [row] = await sql<ProductProposal[]>`
    insert into product_proposals ${sql({
      status,
      nameHr: d.nameHr,
      nameEn: d.nameEn ?? '',
      shortHr: d.shortHr ?? '',
      shortEn: d.shortEn ?? '',
      descHr: d.descHr ?? '',
      descEn: d.descEn ?? '',
      images: sql.json(d.images ?? []),
      variants: sql.json(normalizeVariants(d.variants ?? []) as never),
      supplierUrl: d.supplierUrl ?? '',
      costCents: d.costCents ?? null,
      estDeliveryHr: d.estDeliveryHr ?? '',
      estDeliveryEn: d.estDeliveryEn ?? '',
      weightDims: d.weightDims ?? '',
      materialHr: d.materialHr ?? '',
      materialEn: d.materialEn ?? '',
      manufacturer: d.manufacturer ?? '',
      euResponsible: d.euResponsible ?? '',
      safetyHr: d.safetyHr ?? '',
      safetyEn: d.safetyEn ?? '',
      qualityTags: sql.json(d.qualityTags ?? []),
      notes: d.notes ?? '',
      sources: d.sources ?? '',
    })} returning *`
  if (status === 'review') await maybeAutoAcceptProposal(row.id)
  return Response.json({ proposal: row }, { status: 201 })
}

export async function PATCH(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = proposalPatchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const { id, ...d } = parsed.data
  const [cur] = await sql<{ status: string }[]>`select status from product_proposals where id = ${id}`
  if (!cur) return Response.json({ error: 'Not found' }, { status: 404 })
  if (['accepted', 'rejected'].includes(cur.status)) {
    return Response.json({ error: 'Proposal locked' }, { status: 409 })
  }
  if (d.status && !['draft', 'review'].includes(d.status)) {
    return Response.json({ error: 'Invalid status for staff' }, { status: 400 })
  }
  const patch: Record<string, unknown> = {}
  const scalar = [
    'status', 'nameHr', 'nameEn', 'shortHr', 'shortEn', 'descHr', 'descEn', 'supplierUrl', 'costCents',
    'estDeliveryHr', 'estDeliveryEn', 'weightDims', 'materialHr', 'materialEn', 'manufacturer', 'euResponsible',
    'safetyHr', 'safetyEn', 'notes', 'sources',
  ] as const
  for (const k of scalar) if (d[k] !== undefined) patch[k] = d[k]
  if (d.images !== undefined) patch.images = sql.json(d.images)
  if (d.variants !== undefined) patch.variants = sql.json(normalizeVariants(d.variants) as never)
  if (d.qualityTags !== undefined) patch.qualityTags = sql.json(d.qualityTags)
  const [row] = await sql<ProductProposal[]>`
    update product_proposals set ${sql(patch)}, updated_at = now() where id = ${id} returning *`
  if (row.status === 'review') await maybeAutoAcceptProposal(row.id)
  return Response.json({ proposal: row })
}
