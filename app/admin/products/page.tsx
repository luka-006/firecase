import Image from 'next/image'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { money } from '@/lib/money'
import { toggleProduct } from '../actions'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Products() {
  await requireAdmin()
  const products = await sql<Product[]>`select * from products order by sort asc, id desc`
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h-display text-2xl">Proizvodi</h1>
        <Link href="/admin/products/new" className="btn btn-sm">+ Novi proizvod</Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-2 text-left text-xs uppercase tracking-wider text-mute">
            <tr><th className="p-3">Proizvod</th><th className="p-3">Model</th><th className="p-3">Cijena</th><th className="p-3">Zaliha</th><th className="p-3">Vidljiv</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-ink-2">
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-ink-3">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-cover" />}</span>
                    <span className="hover:text-flame-2">{p.nameHr}{p.featured && <span className="ml-2 text-[10px] text-flame">★</span>}</span>
                  </Link>
                </td>
                <td className="p-3 text-mute">{p.fits || '-'}</td>
                <td className="p-3 tabular-nums">{money(p.priceCents)}{p.compareCents && <span className="ml-1 text-xs text-mute line-through">{money(p.compareCents)}</span>}</td>
                <td className="p-3 text-mute">{p.stock ?? '∞'}</td>
                <td className="p-3">
                  <form action={toggleProduct}><input type="hidden" name="id" value={p.id} />
                    <button className={`rounded-full px-2.5 py-0.5 text-[11px] ${p.active ? 'bg-emerald-900/60 text-emerald-200' : 'bg-zinc-800 text-zinc-400'}`}>{p.active ? 'Da' : 'Ne'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
