import 'server-only'
import { unstable_cache } from 'next/cache'
import { sql } from './db'

export type Settings = {
  shippingCents: number
  freeThresholdCents: number
  shipEu: boolean
  euShippingCents: number
  deliveryHr: string
  deliveryEn: string
  announcementHr: string
  announcementEn: string
  autoAcceptProposals: boolean
  supplierLogisticMode: 'auto' | 'name'
  supplierLogisticName: string
  supplierLogisticMaxDays: number
  supplierFromCountry: string
  supplierPayEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  shippingCents: 499,
  freeThresholdCents: 3000,
  shipEu: false,
  euShippingCents: 999,
  deliveryHr: '8–16 dana',
  deliveryEn: '8–16 days',
  announcementHr: '',
  announcementEn: '',
  autoAcceptProposals: false,
  supplierLogisticMode: 'auto',
  supplierLogisticName: '',
  supplierLogisticMaxDays: 20,
  supplierFromCountry: 'CN',
  supplierPayEnabled: false,
}

async function load(): Promise<Settings> {
  try {
    const rows = await sql<{ value: Partial<Settings> }[]>`select value from settings where key = 'main'`
    const merged = { ...DEFAULT_SETTINGS, ...(rows[0]?.value ?? {}) }
    if (merged.supplierLogisticMode !== 'name') merged.supplierLogisticMode = 'auto'
    const days = Number(merged.supplierLogisticMaxDays)
    merged.supplierLogisticMaxDays = Number.isFinite(days) && days > 0 ? Math.min(90, Math.round(days)) : DEFAULT_SETTINGS.supplierLogisticMaxDays
    merged.supplierFromCountry = String(merged.supplierFromCountry || 'CN').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) || 'CN'
    merged.supplierPayEnabled = merged.supplierPayEnabled === true
    merged.supplierLogisticName = String(merged.supplierLogisticName || '').slice(0, 50)
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const getSettings = unstable_cache(load, ['settings'], { tags: ['settings'], revalidate: 300 })
export const getSettingsFresh = load

export async function saveSettings(s: Settings) {
  await sql`insert into settings (key, value) values ('main', ${sql.json(s)})
    on conflict (key) do update set value = excluded.value`
}

export function shippingFor(subtotalCents: number, country: string, s: Settings) {
  if (country === 'HR') return subtotalCents >= s.freeThresholdCents ? 0 : s.shippingCents
  return s.euShippingCents
}

export function allowedCountries(s: Settings) {
  return s.shipEu ? null : ['HR']
}
