import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { getUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import type { Product } from '@/lib/types'

export const metadata: Metadata = { title: 'Favoriti · Favorites', robots: { index: false } }

export default async function Favorites({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  const user = await getUser()
  if (!user) redirect(href(locale, 'login'))
  const d = t(locale)
  const products = await sql<Product[]>`select p.* from favorites f join products p on p.id = f.product_id
    where f.user_id = ${user.id} and p.active order by f.created_at desc`
  return (
    <div className="container-x pt-14">
      <h1 className="h-display text-3xl">{d.favorites}</h1>
      {products.length === 0 ? <p className="mt-10 text-mute">{d.noFavorites}</p> : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} locale={locale} />)}
        </div>
      )}
    </div>
  )
}
