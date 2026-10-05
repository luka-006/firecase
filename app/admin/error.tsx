'use client'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4 border border-amber-900/60 bg-amber-950/30 p-5 text-sm text-amber-100">
      <p className="font-medium">Ova stranica se nije uspjela učitati.</p>
      <p className="break-all font-mono text-xs text-amber-200/70">{error.message}{error.digest ? ` · ref ${error.digest}` : ''}</p>
      <button onClick={reset} className="btn btn-sm">Pokušaj ponovo</button>
    </div>
  )
}
