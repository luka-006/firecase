import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="h-display text-6xl text-flame">404</p>
      <p className="text-mute">Stranica nije pronađena · Page not found</p>
      <Link href="/" className="btn">Firecase</Link>
    </div>
  )
}
