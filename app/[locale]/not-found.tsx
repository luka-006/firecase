import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-start justify-center gap-6 pt-14">
      <p className="eyebrow">404</p>
      <h1 className="h-display text-4xl leading-[1] sm:text-6xl">Stranica ne postoji.</h1>
      <p className="text-sm text-mute">Page not found.</p>
      <Link href="/" className="btn">Firecase</Link>
    </div>
  )
}
