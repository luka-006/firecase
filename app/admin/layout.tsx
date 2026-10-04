import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import '../globals.css'
import { isAdmin } from '@/lib/auth'
import { adminLogout } from './actions'

export const metadata: Metadata = { title: 'Admin | Firecase', robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin()
  const links = [['/admin', 'Pregled'], ['/admin/products', 'Proizvodi'], ['/admin/orders', 'Narudžbe'], ['/admin/invoices', 'Računi'], ['/admin/settings', 'Postavke']]
  return (
    <html lang="hr">
      <body className="min-h-svh">
        {admin && (
          <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
            <div className="container-x flex h-14 items-center gap-6 overflow-x-auto">
              <Link href="/admin" className="flex shrink-0 items-center gap-2"><Image src="/logo-mark.svg" alt="" width={11} height={21} className="h-5 w-auto" /><span className="text-xs tracking-widest text-mute">ADMIN</span></Link>
              <nav className="flex gap-5 text-sm">
                {links.map(([h, l]) => <Link key={h} href={h} className="shrink-0 text-bone/70 hover:text-bone">{l}</Link>)}
              </nav>
              <div className="ml-auto flex shrink-0 items-center gap-4 text-sm">
                <Link href="/" target="_blank" className="text-mute hover:text-bone">Stranica ↗</Link>
                <form action={adminLogout}><button className="text-mute hover:text-bone">Odjava</button></form>
              </div>
            </div>
          </header>
        )}
        <main className="container-x py-10">{children}</main>
      </body>
    </html>
  )
}
