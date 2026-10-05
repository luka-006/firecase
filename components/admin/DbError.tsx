import { runMigrations } from '@/app/admin/actions'

// Prikazuje stvarnu grešku baze umjesto pada stranice, s uputom kako je riješiti
export function DbError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error)
  const code = (error as { code?: string } | null)?.code
  const missing = code === '42P01' || /does not exist/i.test(msg)
  const noDb = /ECONNREFUSED|ENOTFOUND|localhost:5432/i.test(msg)
  const hint = missing
    ? 'Tablice u bazi još ne postoje. Klikni gumb ispod ili napravi Redeploy u Vercelu.'
    : noDb
      ? 'Baza nije spojena. U Vercelu: projekt → Storage → Neon → Connect Project, zatim Deployments → Redeploy.'
      : 'Greška pri radu s bazom. Pošalji ovu poruku developeru.'
  return (
    <div className="space-y-3 border border-amber-900/60 bg-amber-950/30 p-5 text-sm text-amber-100">
      <p className="font-medium">{hint}</p>
      <p className="break-all font-mono text-xs text-amber-200/70">{msg}</p>
      {!noDb && (
        <form action={runMigrations}>
          <button className="btn btn-sm">Kreiraj tablice u bazi</button>
        </form>
      )}
    </div>
  )
}
