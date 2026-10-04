const COLORS: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-300', paid: 'bg-amber-900/60 text-amber-200', shipped: 'bg-sky-900/60 text-sky-200',
  delivered: 'bg-emerald-900/60 text-emerald-200', cancelled: 'bg-zinc-800 text-zinc-500', refunded: 'bg-red-900/50 text-red-200',
  ok: 'bg-emerald-900/60 text-emerald-200', off: 'bg-zinc-800 text-zinc-400', error: 'bg-red-900/50 text-red-200',
}
const LABELS: Record<string, string> = {
  pending: 'Na čekanju', paid: 'Plaćeno – pošalji', shipped: 'Poslano', delivered: 'Dostavljeno', cancelled: 'Otkazano', refunded: 'Vraćen novac',
  ok: 'Fiskalizirano', off: 'Bez fiskalizacije', error: 'Greška',
}
export function Status({ s, fiscal }: { s: string; fiscal?: boolean }) {
  const label = fiscal && s === 'pending' ? 'Čeka fiskalizaciju' : LABELS[s] ?? s
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${COLORS[s] ?? 'bg-zinc-800'}`}>{label}</span>
}
