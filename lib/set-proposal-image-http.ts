import type { SetProposal, SetProposalView } from './set-proposals'
import { setProposalImagesSchema } from './staff/set-proposal-schema'

type ReplaceResult =
  | { ok: true; proposal: SetProposal }
  | { ok: false; error: 'invalid' | 'not_found' | 'not_pending' }

/**
 * Image-only replace. The route passes `staffApiAuthorized(req)` as `authorized`.
 * Nothing here writes a name, price, item list, shipping flag, status, or product.
 */
export async function handleSetImageReplace(input: {
  authorized: boolean
  body: unknown
  jsonError?: boolean
  replace: (id: number, images: string[]) => Promise<ReplaceResult>
  present: (row: SetProposal) => Promise<SetProposalView>
}) {
  if (!input.authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (input.jsonError) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const parsed = setProposalImagesSchema.safeParse(input.body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  const result = await input.replace(parsed.data.id, parsed.data.images)
  if (!result.ok && result.error === 'invalid') return Response.json({ error: 'Invalid id' }, { status: 400 })
  if (!result.ok && result.error === 'not_found') return Response.json({ error: 'Not found' }, { status: 404 })
  if (!result.ok) return Response.json({ error: 'Only pending set proposals can have their images replaced' }, { status: 409 })
  return Response.json({ proposal: await input.present(result.proposal) })
}
