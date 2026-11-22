import 'server-only'
import { buckydropSign } from './buckydrop-sign'

// Live uses the app's own credentials from Vercel (BUCKYDROP_APP_CODE / BUCKYDROP_APP_SECRET).
// BUCKYDROP_SANDBOX=1 switches to BuckyDrop's test gateway with the shared test credentials
// published in their OpenAPI docs; that gateway only knows sample products and never buys anything.
const LIVE = 'https://bdopenapi.buckydrop.com'
const SANDBOX = { base: 'https://dev.buckydrop.com', appCode: '87e05078db55ffa709ca34bd04a0e9e5', appSecret: '1508feaf3034d3adb29bdca2c7e3d4c7' }

export function buckydropConfig() {
  if (process.env.BUCKYDROP_SANDBOX === '1') return { ...SANDBOX, mode: 'sandbox' as const }
  const appCode = process.env.BUCKYDROP_APP_CODE?.trim() || ''
  const appSecret = process.env.BUCKYDROP_APP_SECRET?.trim() || ''
  return { base: LIVE, appCode, appSecret, mode: 'live' as const }
}

export type BdResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: number }

/** One signed POST to the BuckyDrop OpenAPI. The body is serialised once and the same string is signed and sent. */
export async function buckydropPost<T>(path: string, body: unknown): Promise<BdResult<T>> {
  const cfg = buckydropConfig()
  if (!cfg.appCode || !cfg.appSecret) return { ok: false, error: 'BUCKYDROP_APP_CODE ili BUCKYDROP_APP_SECRET nije postavljen u Vercelu.' }
  const json = JSON.stringify(body ?? {})
  const timestamp = String(Date.now())
  const sign = buckydropSign(cfg.appCode, json, timestamp, cfg.appSecret)
  const url = `${cfg.base}${path}?appCode=${encodeURIComponent(cfg.appCode)}&timestamp=${timestamp}&sign=${sign}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', lang: 'en' },
      body: json,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
  } catch (e) {
    return { ok: false, error: `BuckyDrop se ne javlja (${e instanceof Error ? e.message : 'mreža'}).` }
  }
  let out: { success?: boolean; code?: number; info?: string; data?: T }
  try {
    out = await res.json()
  } catch {
    return { ok: false, error: `BuckyDrop je vratio HTTP ${res.status} bez JSON odgovora.` }
  }
  if (!res.ok || out.success === false || (typeof out.code === 'number' && out.code !== 0 && out.code !== 200)) {
    return { ok: false, code: out.code, error: `BuckyDrop: ${out.info || 'greška'}${out.code != null ? ` (kod ${out.code})` : ''}` }
  }
  return { ok: true, data: out.data as T }
}

type Money = { price?: number; priceCent?: number } | null | undefined

export type BdProduct = {
  spuCode?: string
  productName?: string
  productLink?: string
  platform?: string
  picUrl?: string
  shop?: { shopName?: string } | null
  price?: Money
  proPrice?: Money
  freight?: Money
  beginCount?: number
  soldOutTag?: number
  skuList?: { skuCode?: string; skuName?: string; proPrice?: Money; price?: Money; quantity?: number; imgUrl?: string; props?: { propName?: string; valueName?: string }[] }[]
}

export type BdChannel = {
  serviceCode?: string
  serviceName?: string
  totalPrice?: number
  minTimeInTransit?: number
  maxTimeInTransit?: number
  available?: boolean
  unavailableReason?: string
}

export const buckydropBalance = () =>
  buckydropPost<{ currency: string; availableBalance: number }>('/api/rest/v2/adapt/openapi/account/balance', {})

export const buckydropProduct = (productLink: string) =>
  buckydropPost<BdProduct>('/api/rest/v2/adapt/openapi/product/detail', { productLink, lang: 'en' })

/** Shipping channels to a country for a parcel; prices come back in CNY. */
export const buckydropShipping = (countryCode: string, weightKg: number, count: number, goodsPriceCny: number) =>
  buckydropPost<{ records?: BdChannel[] }>('/api/rest/v2/adapt/adaptation/logistics/channel-carriage-list', {
    current: 1,
    size: 20,
    item: { countryCode, lang: 'en', orderBy: 'price', productList: [{ weight: weightKg, count, goodsPrice: goodsPriceCny }] },
  })

export type BdSearchItem = {
  spuCode?: string
  productName?: string
  productLink?: string
  platform?: string
  picUrl?: string
  shop?: { shopName?: string } | null
  price?: Money
  proPrice?: Money
  freight?: Money
}

/** Catalogue search (Taobao TB, 1688 ALIBABA). Read-only. */
export const buckydropSearch = (keyword: string, opts: { platform?: string; page?: number; size?: number; sort?: 'sales' | 'price_asc' } = {}) =>
  buckydropPost<{ total?: number; pages?: number; records?: BdSearchItem[] }>('/api/rest/v2/adapt/openapi/product/search', {
    current: Math.max(1, opts.page ?? 1),
    size: Math.min(40, Math.max(1, opts.size ?? 20)),
    item: {
      keyword,
      lang: 'en',
      ...(opts.platform ? { platform: opts.platform } : {}),
      ...(opts.sort === 'sales' ? { sortType: '9' } : opts.sort === 'price_asc' ? { sortType: '4' } : {}),
    },
  })
