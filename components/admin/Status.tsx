import { orderStage, stageLabel } from '@/lib/supplier-order'

const COLORS: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-300', todo: 'bg-amber-900/60 text-amber-200', ordered: 'bg-violet-900/50 text-violet-200', shipped: 'bg-sky-900/60 text-sky-200',
  delivered: 'bg-emerald-900/60 text-emerald-200', cancelled: 'bg-zinc-800 text-zinc-500', refunded: 'bg-red-900/50 text-red-200',
  ok: 'bg-emerald-900/60 text-emerald-200', off: 'bg-zinc-800 text-zinc-400', error: 'bg-red-900/50 text-red-200',
}

export { orderStage }

export function Status({ s, fiscal }: { s: string; fiscal?: boolean }) {
  return <span className={`inline-block px-2.5 py-0.5 text-[11px] ${COLORS[s] ?? 'bg-zinc-800'}`}>{stageLabel(s, fiscal)}</span>
}
