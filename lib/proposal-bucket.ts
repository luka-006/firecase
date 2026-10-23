import type { ProposalStatus } from './types'

/** Odjeljci na admin listi prijedloga. Skica i pregled čekaju odluku. */
export type ProposalListBucket = 'pending' | 'accepted' | 'rejected'

export const PROPOSAL_LIST_TABS: { id: ProposalListBucket; label: string }[] = [
  { id: 'pending', label: 'Na čekanju' },
  { id: 'accepted', label: 'Prihvaćeno' },
  { id: 'rejected', label: 'Odbijeno' },
]

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Skica',
  review: 'Za pregled',
  accepted: 'Prihvaćeno',
  rejected: 'Odbijeno',
}

export function proposalListBucket(status: string): ProposalListBucket {
  if (status === 'accepted') return 'accepted'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

export function isProposalListBucket(value: string): value is ProposalListBucket {
  return value === 'pending' || value === 'accepted' || value === 'rejected'
}

/** Skica i pregled (Na čekanju). Prihvaćeno i odbijeno se ne brišu. */
export function isDeletableProposalStatus(status: string): boolean {
  return status === 'draft' || status === 'review'
}

/** Pozitivan int4 iz `?id=`. Odbija prazno, predznak, razmake i decimalni zapis. */
export function parseProposalId(raw: string | null): number | null {
  if (raw == null || !/^[1-9]\d*$/.test(raw)) return null
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) return null
  return id
}
