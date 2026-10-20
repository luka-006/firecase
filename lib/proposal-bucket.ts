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
