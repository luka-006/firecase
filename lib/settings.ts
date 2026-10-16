import 'server-only'
import { unstable_cache } from 'next/cache'
import { FREE_SHIPPING_THRESHOLD_CENTS, hrShippingCents } from './commerce'
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
}

export const DEFAULT_SETTINGS: Settings = {
  shippingCents: 499,
  freeThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
  shipEu: false,
  euShippingCents: 999,
  deliveryHr: '8–16 dana',
  deliveryEn: '8–16 days',
  announcementHr: '',
  announcementEn: '',
  autoAcceptProposals: false,
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
  if (country === 'HR') return hrShippingCents(subtotalCents, s.shippingCents, s.freeThresholdCents)
  return s.euShippingCents
}

export function allowedCountries(s: Settings) {
  return s.shipEu ? null : ['HR']
}
