const COLORS: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-300', todo: 'bg-amber-900/60 text-amber-200', ordered: 'bg-violet-900/50 text-violet-200', shipped: 'bg-sky-900/60 text-sky-200',
  delivered: 'bg-emerald-900/60 text-emerald-200', cancelled: 'bg-zinc-800 text-zinc-500', refunded: 'bg-red-900/50 text-red-200',
  ok: 'bg-emerald-900/60 text-emerald-200', off: 'bg-zinc-800 text-zinc-400', error: 'bg-red-900/50 text-red-200',
}
const LABELS: Record<string, string> = {
  pending: 'Nedovršena', todo: 'Za naručiti', ordered: 'Naručeno, čeka slanje', shipped: 'Poslano', delivered: 'Dostavljeno', cancelled: 'Otkazano', refunded: 'Vraćen novac',
  ok: 'Fiskalizirano', off: 'Bez fiskalizacije', error: 'Greška',
}
// Plaćena narudžba je "za naručiti" dok se ne upiše broj narudžbe kod dobavljača
export const orderStage = (o: { status: string; supplierOrder?: string }) =>
  o.status === 'paid' ? (o.supplierOrder ? 'ordered' : 'todo') : o.status

export function Status({ s, fiscal }: { s: string; fiscal?: boolean }) {
  const label = fiscal && s === 'pending' ? 'Čeka fiskalizaciju' : LABELS[s] ?? s
  return <span className={`inline-block px-2.5 py-0.5 text-[11px] ${COLORS[s] ?? 'bg-zinc-800'}`}>{label}</span>
}
