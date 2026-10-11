import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import '../globals.css'
import { isStaff } from '@/lib/auth'
import { staffLogout } from './actions'

export const metadata: Metadata = { title: 'Staff | Firecase', robots: { index: false, follow: false } }

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await isStaff()
  return (
    <html lang="hr">
      <body className="min-h-svh">
        {staff && (
          <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
            <div className="container-x flex h-14 items-center gap-4">
              <Link href="/staff/proposals" className="flex shrink-0 items-center gap-2">
                <Image src="/logo-mark.svg" alt="" width={11} height={21} className="h-5 w-auto" />
                <span className="text-xs tracking-widest text-mute">STAFF</span>
              </Link>
              <nav className="text-sm text-mute">
                <Link href="/staff/proposals" className="hover:text-bone">Prijedlozi proizvoda</Link>
              </nav>
              <form action={staffLogout} className="ml-auto">
                <button className="text-sm text-mute hover:text-bone">Odjava</button>
              </form>
            </div>
          </header>
        )}
        <main className="container-x py-10">{children}</main>
      </body>
    </html>
  )
}
