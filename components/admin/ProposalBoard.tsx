'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { deletePendingProposal, moveProposalStatus } from '@/app/admin/actions'
import { PROPOSAL_LIST_TABS, proposalListBucket, type ProposalListBucket } from '@/lib/proposal-bucket'
import type { ProposalStatus } from '@/lib/types'

export type ProposalListItem = {
  id: number
  nameHr: string
  status: ProposalStatus
  qualityTags: string[]
  updatedLabel: string
  productId: number | null
  rejectReason: string | null
}

const FLASH_MS = 520
const LEAVE_MS = 340

type Phase = { id: number; bucket: ProposalListBucket; stage: 'flash' | 'leave' }

function sleep(ms: number) {
  return new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })
}

export function ProposalBoard({ items: initial }: { items: ProposalListItem[] }) {
  const [items, setItems] = useState(initial)
  const [tab, setTab] = useState<ProposalListBucket>('pending')
  const [phase, setPhase] = useState<Phase | null>(null)
  const [arrivedId, setArrivedId] = useState<number | null>(null)
  const [rejectFor, setRejectFor] = useState<number | null>(null)
  const [deleteFor, setDeleteFor] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<{ id: number; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const animating = useRef(false)
  const tabRef = useRef(tab)
  const mounted = useRef(true)
  const tabBtn = useRef<Partial<Record<ProposalListBucket, HTMLButtonElement | null>>>({})

  useEffect(() => {
    if (!animating.current) setItems(initial)
  }, [initial])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  function selectTab(next: ProposalListBucket, focus = false) {
    tabRef.current = next
    setTab(next)
    if (focus) tabBtn.current[next]?.focus()
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const index = PROPOSAL_LIST_TABS.findIndex((t) => t.id === tabRef.current)
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? PROPOSAL_LIST_TABS.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : PROPOSAL_LIST_TABS.length - 1)) % PROPOSAL_LIST_TABS.length
    selectTab(PROPOSAL_LIST_TABS[next].id, true)
  }

  async function move(item: ProposalListItem, bucket: ProposalListBucket, why?: string) {
    if (busy || animating.current) return
    const trimmed = why?.trim() ?? ''
    if (bucket === 'rejected' && !trimmed) {
      setRejectFor(item.id)
      setError({ id: item.id, text: 'Upišite razlog odbijanja.' })
      return
    }
    animating.current = true
    setBusy(true)
    setError(null)
    setRejectFor(null)
    const fromTab = tabRef.current
    setPhase({ id: item.id, bucket, stage: 'flash' })
    const started = performance.now()
    const result = await moveProposalStatus(item.id, bucket, trimmed)
    const wait = FLASH_MS - (performance.now() - started)
    if (wait > 0) await sleep(wait)
    if (!mounted.current) return
    if (!result.ok) {
      setPhase(null)
      setError({ id: item.id, text: result.error })
      if (bucket === 'rejected') {
        setRejectFor(item.id)
        setReason(trimmed)
      }
      animating.current = false
      setBusy(false)
      return
    }
    setPhase({ id: item.id, bucket, stage: 'leave' })
    await sleep(LEAVE_MS)
    if (!mounted.current) return
    setItems((prev) => {
      const next = prev.map((row) => row.id === item.id ? {
        ...row,
        status: result.status,
        productId: result.productId,
        rejectReason: bucket === 'rejected' ? trimmed : null,
        updatedLabel: new Date().toLocaleString('hr-HR'),
      } : row)
      const index = next.findIndex((row) => row.id === item.id)
      if (index <= 0) return next
      const [row] = next.splice(index, 1)
      return [row, ...next]
    })
    setPhase(null)
    setArrivedId(item.id)
    if (tabRef.current === fromTab) selectTab(bucket)
    animating.current = false
    setBusy(false)
    window.setTimeout(() => {
      if (mounted.current) setArrivedId((cur) => (cur === item.id ? null : cur))
    }, 450)
  }

  async function remove(item: ProposalListItem) {
    if (busy || animating.current) return
    setBusy(true)
    setError(null)
    try {
      const result = await deletePendingProposal(item.id)
      if (!mounted.current) return
      if (!result.ok) {
        setError({ id: item.id, text: result.error })
        return
      }
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      setDeleteFor(null)
    } catch {
      if (!mounted.current) return
      setError({ id: item.id, text: 'Brisanje nije uspjelo.' })
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  const counts = {
    pending: items.filter((item) => proposalListBucket(item.status) === 'pending').length,
    accepted: items.filter((item) => proposalListBucket(item.status) === 'accepted').length,
    rejected: items.filter((item) => proposalListBucket(item.status) === 'rejected').length,
  }
  const visible = items.filter((item) => proposalListBucket(item.status) === tab)

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div role="tablist" aria-label="Prijedlozi" onKeyDown={onTabKey} className="grid grid-cols-3 border-b border-line">
        {PROPOSAL_LIST_TABS.map((entry) => {
          const active = tab === entry.id
          const accent = entry.id === 'accepted' ? 'border-emerald-500' : entry.id === 'rejected' ? 'border-red-500' : 'border-bone'
          return (
            <button
              key={entry.id}
              ref={(node) => { tabBtn.current[entry.id] = node }}
              type="button"
              role="tab"
              id={`prijedlozi-tab-${entry.id}`}
              aria-selected={active}
              aria-controls={`prijedlozi-panel-${entry.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(entry.id)}
              className={`min-h-12 min-w-0 touch-manipulation border-b-2 px-1 py-2 text-center text-[13px] leading-tight ${active ? `${accent} bg-ink-3 text-bone` : 'border-transparent text-mute'}`}
            >
              <span className="block break-words">{entry.label}</span>
              <span className="mt-0.5 block text-[11px] text-mute">{counts[entry.id]}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`prijedlozi-panel-${tab}`} aria-labelledby={`prijedlozi-tab-${tab}`}>
        <ul className="card divide-y divide-line">
          {visible.length === 0 && <li className="p-5 text-sm text-mute">Nema prijedloga.</li>}
          {visible.map((item) => {
            const bucket = proposalListBucket(item.status)
            const hot = phase?.id === item.id ? phase : null
            const leaving = hot?.stage === 'leave'
            const tone = hot?.bucket === 'accepted' || (!hot && bucket === 'accepted')
              ? 'bg-emerald-950/70'
              : hot?.bucket === 'rejected' || (!hot && bucket === 'rejected')
                ? 'bg-red-950/55'
                : ''
            const rail = (hot?.bucket ?? bucket) === 'accepted'
              ? 'shadow-[inset_3px_0_0_0_#34d399]'
              : (hot?.bucket ?? bucket) === 'rejected'
                ? 'shadow-[inset_3px_0_0_0_#f87171]'
                : ''
            const flash = hot?.bucket === 'accepted'
              ? 'bg-emerald-700/90'
              : hot?.bucket === 'rejected'
                ? 'bg-red-800/90'
                : hot
                  ? 'bg-white/10'
                  : ''
            return (
              <li
                key={item.id}
                data-proposal-id={item.id}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className={`space-y-3 p-4 text-sm transition-colors duration-300 ${flash || tone} ${rail} ${hot ? 'pointer-events-none' : ''} ${arrivedId === item.id ? 'proposal-arrive' : ''}`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/prijedlozi/${item.id}`} className="break-words font-medium link">{item.nameHr || `#${item.id}`}</Link>
                        {item.status === 'draft' && <span className="ml-2 text-xs text-mute">Skica</span>}
                        {item.qualityTags.length > 0 && <span className="mt-1 block text-xs text-mute sm:ml-2 sm:mt-0 sm:inline">{item.qualityTags.join(' · ')}</span>}
                        {item.productId ? <Link href={`/admin/products/${item.productId}`} className="mt-1 block text-xs link sm:ml-2 sm:mt-0 sm:inline">Proizvod</Link> : null}
                      </div>
                      <span className="shrink-0 text-xs text-mute">{item.updatedLabel}</span>
                    </div>
                    {bucket === 'rejected' && item.rejectReason ? <p className="line-clamp-2 break-words text-xs text-red-300">{item.rejectReason}</p> : null}
                    {error?.id === item.id && <p role="alert" className="text-sm text-red-300">{error.text}</p>}
                    {hot ? null : rejectFor === item.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          void move(item, 'rejected', reason)
                        }}
                        className="grid grid-cols-2 gap-2"
                      >
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="input col-span-2 text-base"
                          style={{ fontSize: 16 }}
                          placeholder="Razlog"
                          aria-label="Razlog"
                          required
                          autoFocus
                          enterKeyHint="done"
                          autoComplete="off"
                        />
                        <button type="button" className="btn-ghost btn-sm min-h-11 touch-manipulation" onClick={() => { setRejectFor(null); setError(null) }}>Odustani</button>
                        <button type="submit" className="btn btn-sm min-h-11 touch-manipulation" disabled={busy}>Odbij</button>
                      </form>
                    ) : deleteFor === item.id ? (
                      <div className="grid grid-cols-2 gap-2">
                        <p className="col-span-2 text-sm text-bone">Obrisati prijedlog?</p>
                        <button type="button" className="btn-ghost btn-sm min-h-11 w-full touch-manipulation" onClick={() => { setDeleteFor(null); setError(null) }}>Odustani</button>
                        <button type="button" className="btn btn-sm min-h-11 w-full touch-manipulation" disabled={busy} onClick={() => void remove(item)}>Obriši</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {bucket !== 'accepted' && (
                          <button type="button" className="btn btn-sm min-h-11 w-full touch-manipulation sm:w-auto" disabled={busy} onClick={() => void move(item, 'accepted')}>Prihvati</button>
                        )}
                        {bucket !== 'rejected' && (
                          <button type="button" className="btn-ghost btn-sm min-h-11 w-full touch-manipulation border-red-900 text-red-300 sm:w-auto" disabled={busy} onClick={() => { setRejectFor(item.id); setDeleteFor(null); setReason(''); setError(null) }}>Odbij</button>
                        )}
                        {bucket !== 'pending' && (
                          <button type="button" className="btn-ghost btn-sm min-h-11 w-full touch-manipulation sm:w-auto" disabled={busy} onClick={() => void move(item, 'pending')}>Na čekanju</button>
                        )}
                        {bucket === 'pending' && (
                          <button type="button" className="btn-ghost btn-sm min-h-11 w-full touch-manipulation border-red-900 text-red-300 sm:w-auto" disabled={busy} onClick={() => { setDeleteFor(item.id); setRejectFor(null); setReason(''); setError(null) }}>Obriši</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
