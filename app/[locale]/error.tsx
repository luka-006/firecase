'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x flex min-h-[55vh] flex-col items-start justify-center gap-6 pt-14">
      <p className="eyebrow">Greška · Error</p>
      <h1 className="h-display text-4xl leading-[1] sm:text-6xl">Nešto je pošlo po zlu.</h1>
      <p className="text-sm text-mute">Something went wrong.{error.digest ? ` Ref: ${error.digest}` : ''}</p>
      <button onClick={reset} className="btn">Pokušaj ponovo</button>
    </div>
  )
}
