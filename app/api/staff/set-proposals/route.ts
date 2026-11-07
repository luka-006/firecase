import { staffApiAuthorized } from '@/lib/auth'
import { sql } from '@/lib/db'
import { handleSetImageReplace } from '@/lib/set-proposal-image-http'
import { listSetProposals, maybeAutoAcceptSetProposal, presentSetProposal, replacePendingSetProposalImages, resolveSetItems, type SetProposal } from '@/lib/set-proposals'
import { setProposalCreateSchema } from '@/lib/staff/set-proposal-schema'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const status = new URL(req.url).searchParams.get('status')
  return Response.json({ proposals: await listSetProposals(status || undefined) })
}

export async function POST(req: Request) {
  if (!staffApiAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = setProposalCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data
  const resolved = await resolveSetItems(data.items.map((item) => ({ productId: item.productId, slug: item.slug?.trim() })))
  if (!resolved.ok) return Response.json({ error: 'Unknown products', missing: resolved.missing }, { status: 400 })
  const nameHr = (data.nameHr ?? data.name ?? '').trim()
  const status = data.status === 'draft' ? 'draft' : 'review'
  const [row] = await sql<SetProposal[]>`
    insert into set_proposals ${sql({
      status,
      nameHr,
      shortHr: data.shortHr.trim(),
      images: sql.json(data.images),
      items: sql.json(resolved.items),
      priceCents: data.priceCents,
      freeShipping: data.freeShipping !== false,
      sizeMix: (data.sizeMix ?? '').trim(),
      notes: (data.notes ?? '').trim(),
    })} returning *`
  if (status === 'review') await maybeAutoAcceptSetProposal(row.id)
  const [fresh] = await sql<SetProposal[]>`select * from set_proposals where id = ${row.id}`
  return Response.json({ proposal: await presentSetProposal(fresh ?? row) }, { status: 201 })
}

export async function PATCH(req: Request) {
  let body: unknown
  let jsonError = false
  try {
    body = await req.json()
  } catch {
    jsonError = true
  }
  return handleSetImageReplace({
    authorized: staffApiAuthorized(req),
    body,
    jsonError,
    replace: replacePendingSetProposalImages,
    present: presentSetProposal,
  })
}
