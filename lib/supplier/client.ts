import 'server-only'
import { sql } from '../db'
import { safeSupplierMessage, supplierId } from './ids'

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const LOCK = 733211
const GAP_MS = 1100
const SKEW_MS = 60 * 60 * 1000

export class SupplierError extends Error {
  constructor(message: string, readonly code?: number, readonly authFailed = false) {
    super(message)
  }
}

type TokenRow = {
  accessToken: string
  accessExpiresAt: Date | null
  refreshToken: string
  refreshExpiresAt: Date | null
  openId: string
  lastAuthAt: Date | null
  lastError: string | null
}

type AuthData = {
  openId?: number | string
  accessToken?: string
  accessTokenExpiryDate?: string
  refreshToken?: string
  refreshTokenExpiryDate?: string
}

type Envelope<T> = {
  code?: number
  result?: boolean
  success?: boolean
  message?: string
  data?: T
}

type VariantPayload = {
  vid?: string
  variantSku?: string
  variantSellPrice?: number | string
  inventories?: { totalInventory?: number }[] | null
}

type StockArea = { totalInventoryNum?: number; storageNum?: number }

function accessUsable(row: TokenRow | null | undefined) {
  if (!row?.accessToken || !row.accessExpiresAt) return false
  return new Date(row.accessExpiresAt).getTime() - SKEW_MS > Date.now()
}

function refreshUsable(row: TokenRow | null | undefined) {
  if (!row?.refreshToken || !row.refreshExpiresAt) return false
  return new Date(row.refreshExpiresAt).getTime() - SKEW_MS > Date.now()
}

function parseExpiry(value: string | undefined, fallbackDays: number) {
  const parsed = value ? Date.parse(value) : NaN
  if (Number.isFinite(parsed)) return new Date(parsed)
  return new Date(Date.now() + fallbackDays * 86_400_000)
}

function isAuthFailure(code?: number, message?: string, status?: number) {
  if (status === 401 || code === 1600001 || code === 1600002) return true
  return /authentication failed|access token is failure|token is failure|invalid token/i.test(message || '')
}

export function isSupplierNotFound(e: unknown) {
  return e instanceof SupplierError && e.code === 1600300 && /not found/i.test(e.message)
}

async function readEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text()
  let json: Envelope<T>
  try {
    json = JSON.parse(text) as Envelope<T>
  } catch {
    throw new SupplierError(`Odgovor ${res.status}`)
  }
  const ok = json.code === 200 && json.result !== false && json.success !== false
  if (!ok) {
    throw new SupplierError(safeSupplierMessage(json.message), json.code, isAuthFailure(json.code, json.message, res.status))
  }
  return json.data as T
}

async function reserveSlot(tx: typeof sql) {
  await tx`insert into supplier_api_guard (id, last_request_at) values (1, '1970-01-01'::timestamptz) on conflict (id) do nothing`
  const [row] = await tx<{ lastRequestAt: Date }[]>`select last_request_at from supplier_api_guard where id = 1`
  const last = row?.lastRequestAt ? new Date(row.lastRequestAt).getTime() : 0
  const wait = Math.max(0, GAP_MS - (Date.now() - last))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  await tx`update supplier_api_guard set last_request_at = now() where id = 1`
}

async function authPost(path: string, body: unknown): Promise<AuthData> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  return readEnvelope<AuthData>(res)
}

async function readToken() {
  const [row] = await sql<TokenRow[]>`select access_token, access_expires_at, refresh_token, refresh_expires_at, open_id, last_auth_at, last_error
    from supplier_api_tokens where id = 1`
  return row ?? null
}

async function ensureAccessToken(): Promise<string> {
  const cached = await readToken()
  if (accessUsable(cached)) return cached!.accessToken
  const outcome = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK})`
    await tx`insert into supplier_api_tokens (id) values (1) on conflict (id) do nothing`
    const [row] = await tx<TokenRow[]>`select access_token, access_expires_at, refresh_token, refresh_expires_at, open_id, last_auth_at, last_error
      from supplier_api_tokens where id = 1 for update`
    if (accessUsable(row)) return { token: row!.accessToken }
    if (row?.lastError && row.lastAuthAt && Date.now() - new Date(row.lastAuthAt).getTime() < 60_000) {
      return { error: row.lastError }
    }
    const key = process.env.CJ_API_KEY || ''
    if (!key) return { error: 'Dobavljač nije postavljen.' }
    try {
      let data: AuthData | null = null
      if (refreshUsable(row)) {
        await reserveSlot(tx as unknown as typeof sql)
        try {
          data = await authPost('/authentication/refreshAccessToken', { refreshToken: row!.refreshToken })
        } catch (e) {
          const rejected = e instanceof SupplierError && (e.authFailed || /refresh token/i.test(e.message))
          if (!rejected) throw e
        }
      }
      if (!data?.accessToken) {
        await reserveSlot(tx as unknown as typeof sql)
        data = await authPost('/authentication/getAccessToken', { apiKey: key })
      }
      if (!data?.accessToken) return { error: 'Nema tokena.' }
      const openId = data.openId != null && String(data.openId) !== '' ? String(data.openId) : (row?.openId || '')
      await tx`update supplier_api_tokens set
        access_token = ${data.accessToken},
        access_expires_at = ${parseExpiry(data.accessTokenExpiryDate, 14)},
        refresh_token = ${data.refreshToken || row?.refreshToken || ''},
        refresh_expires_at = ${data.refreshToken || row?.refreshToken ? parseExpiry(data.refreshTokenExpiryDate, 14) : null},
        open_id = ${openId},
        updated_at = now(),
        last_auth_at = now(),
        last_error = null
        where id = 1`
      return { token: data.accessToken }
    } catch (e) {
      const message = safeSupplierMessage((e as Error).message)
      await tx`update supplier_api_tokens set last_auth_at = now(), last_error = ${message}, updated_at = now() where id = 1`
      return { error: message }
    }
  })
  if (!outcome || !('token' in outcome) || !outcome.token) {
    throw new SupplierError(('error' in (outcome || {}) && (outcome as { error?: string }).error) || 'Greška dobavljača')
  }
  return outcome.token
}

async function callApi<T>(method: 'GET' | 'POST', path: string, token: string, opts?: { query?: Record<string, string | undefined>; body?: unknown }) {
  const url = new URL(`${BASE}${path}`)
  for (const [key, value] of Object.entries(opts?.query || {})) {
    if (value) url.searchParams.set(key, value)
  }
  const res = await fetch(url, {
    method,
    headers: {
      'CJ-Access-Token': token,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'POST' ? JSON.stringify(opts?.body ?? {}) : undefined,
    signal: AbortSignal.timeout(25_000),
  })
  return readEnvelope<T>(res)
}

export async function supplierRequest<T>(method: 'GET' | 'POST', path: string, opts?: { query?: Record<string, string | undefined>; body?: unknown }, retried = false): Promise<T> {
  const token = await ensureAccessToken()
  const outcome = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK})`
    await reserveSlot(tx as unknown as typeof sql)
    try {
      const data = await callApi<T>(method, path, token, opts)
      return { ok: true as const, data }
    } catch (e) {
      const error = e instanceof SupplierError ? e : new SupplierError(safeSupplierMessage((e as Error).message))
      return { ok: false as const, error }
    }
  })
  if (outcome.ok) return outcome.data
  if (outcome.error.authFailed && !retried) {
    await sql`update supplier_api_tokens set access_expires_at = now() where id = 1`
    return supplierRequest<T>(method, path, opts, true)
  }
  throw outcome.error
}

export async function supplierOpenId() {
  const row = await readToken()
  return row?.openId || ''
}

function priceUsd(value: number | string | undefined) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toFixed(2)} USD` : '—'
}

export async function lookupVariant(vidRaw: string, skuRaw: string) {
  const vid = supplierId(vidRaw)
  const sku = supplierId(skuRaw)
  if (!vid && !sku) throw new SupplierError('Upišite VID ili SKU.')
  let row: VariantPayload | null = null
  if (vid) {
    row = await supplierRequest<VariantPayload>('GET', '/product/variant/queryByVid', { query: { vid, features: 'enable_inventory' } })
  } else {
    const list = await supplierRequest<VariantPayload[] | null>('GET', '/product/variant/query', { query: { variantSku: sku } })
    const items = Array.isArray(list) ? list : []
    row = items.find((item) => item.variantSku === sku) || items[0] || null
  }
  if (!row || (!row.vid && !row.variantSku)) throw new SupplierError('Varijanta nije pronađena.')
  let stock = Array.isArray(row.inventories) ? row.inventories.reduce((sum, item) => sum + (Number(item.totalInventory) || 0), 0) : null
  const resolvedVid = row.vid || vid
  if (stock === null && resolvedVid) {
    const areas = await supplierRequest<StockArea[] | null>('GET', '/product/stock/queryByVid', { query: { vid: resolvedVid } })
    stock = (Array.isArray(areas) ? areas : []).reduce((sum, area) => sum + (Number(area.totalInventoryNum ?? area.storageNum) || 0), 0)
  }
  return { priceUsd: priceUsd(row.variantSellPrice), stock: stock ?? 0, vid: resolvedVid, sku: row.variantSku || sku }
}
