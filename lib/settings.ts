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
  fiscalEnabled: boolean
  fiscalEnv: 'test' | 'prod'
  premises: string
  device: string
  seqMode: 'P' | 'N'
}

export const DEFAULT_SETTINGS: Settings = {
  shippingCents: 499,
  freeThresholdCents: 3000,
  shipEu: false,
  euShippingCents: 999,
  deliveryHr: '3–7 radnih dana',
  deliveryEn: '3–7 business days',
  announcementHr: '',
  announcementEn: '',
  fiscalEnabled: false,
  fiscalEnv: 'test',
  premises: 'WEB1',
  device: '1',
  seqMode: 'P',
}

async function load(): Promise<Settings> {
  try {
    const rows = await sql<{ value: Partial<Settings> }[]>`select value from settings where key = 'main'`
    return { ...DEFAULT_SETTINGS, ...(rows[0]?.value ?? {}) }
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
