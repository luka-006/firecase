'use server'
import { requireAdmin } from '@/lib/auth'
import { buckydropProduct, buckydropSearch, buckydropShipping, type BdChannel, type BdProduct, type BdSearchItem } from '@/lib/buckydrop'

export type ProductState = { error?: string; product?: BdProduct } | null
export type ShippingState = { error?: string; channels?: BdChannel[] } | null
export type SearchState = { error?: string; items?: BdSearchItem[]; total?: number } | null

const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Read-only: what BuckyDrop knows about a product link (codes, CNY price, variants). Nothing is ordered. */
export async function lookupBuckydropProduct(_: ProductState, f: FormData): Promise<ProductState> {
  await requireAdmin()
  const link = String(f.get('link') ?? '').trim()
  if (!/^https?:\/\//i.test(link)) return { error: 'Zalijepite cijeli link proizvoda (https://…).' }
  const r = await buckydropProduct(link.slice(0, 600))
  return r.ok ? { product: r.data } : { error: r.error }
}

/** Read-only: shipping channels and prices to a country for a parcel. Nothing is ordered. */
export async function estimateBuckydropShipping(_: ShippingState, f: FormData): Promise<ShippingState> {
  await requireAdmin()
  const country = String(f.get('country') ?? 'HR').trim().toUpperCase().slice(0, 2)
  const grams = num(f.get('grams'))
  const count = Math.round(num(f.get('count')))
  const cny = num(f.get('cny'))
  if (!/^[A-Z]{2}$/.test(country)) return { error: 'Država kao dva slova, npr. HR.' }
  if (!(grams > 0 && grams <= 30000) || !(count >= 1 && count <= 100) || !(cny >= 0)) return { error: 'Upišite težinu u gramima, količinu i cijenu komada u CNY.' }
  const r = await buckydropShipping(country, Math.round(grams) / 1000, count, Math.round(cny * 100) / 100)
  if (!r.ok) return { error: r.error }
  return { channels: (r.data?.records ?? []).slice(0, 12) }
}

/** Read-only: catalogue search on Taobao / 1688 through BuckyDrop. Nothing is ordered. */
export async function searchBuckydrop(_: SearchState, f: FormData): Promise<SearchState> {
  await requireAdmin()
  const keyword = String(f.get('keyword') ?? '').trim().slice(0, 120)
  const platform = String(f.get('platform') ?? '')
  if (!keyword) return { error: 'Upišite pojam za pretragu.' }
  const r = await buckydropSearch(keyword, { platform: platform === 'TB' || platform === 'ALIBABA' ? platform : undefined, sort: 'sales' })
  if (!r.ok) return { error: r.error }
  return { items: r.data?.records ?? [], total: r.data?.total }
}
