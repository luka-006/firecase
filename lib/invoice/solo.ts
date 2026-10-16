import 'server-only'
import type { InvoiceData, Order } from '../types'

export type SoloCreateResult = {
  id: string
  brojRacuna: string
  jir: string
  zki: string
  pdf: string
}

type SoloJson = {
  status: number
  message?: string
  racun?: {
    id: string
    broj_racuna: string
    jir?: string
    zki?: string
    pdf?: string
  }
}

function soloToken() {
  const t = process.env.SOLO_API_TOKEN?.trim()
  if (!t) throw new Error('SOLO_API_TOKEN nije postavljen.')
  return t
}

function soloTipUsluge() {
  const id = process.env.SOLO_TIP_USLUGE?.trim()
  if (!id || !/^\d+$/.test(id)) {
    throw new Error('SOLO_TIP_USLUGE mora biti numerički ID tipa usluge iz Soloa (Usluge → Tipovi usluga).')
  }
  return id
}

function soloTipRacuna() {
  const v = process.env.SOLO_TIP_RACUNA?.trim() || '4'
  return v
}

/** HR format: 1234,56 */
export function formatSoloAmount(cents: number) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const eur = (abs / 100).toFixed(2).replace('.', ',')
  return `${sign}${eur}`
}

function buyerType(country: string) {
  if (country === 'HR') return '1'
  const eu = new Set([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  ])
  if (eu.has(country)) return '4'
  return '5'
}

function paymentMethodCode(method: string | null) {
  return /paypal/i.test(method || '') ? '5' : '3'
}

function buildBuyerAddress(order: Order) {
  return `${order.address}, ${order.postal} ${order.city}, ${order.country}`.slice(0, 255)
}

export function buildSoloInvoiceBody(order: Order, data: InvoiceData) {
  const parts: string[] = []
  const push = (k: string, v: string) => {
    parts.push(`${k}=${encodeURIComponent(v)}`)
  }
  push('token', soloToken())
  push('tip_usluge', soloTipUsluge())
  push('tip_racuna', soloTipRacuna())
  push('tip_kupca', buyerType(order.country))

  if (order.name) push('kupac_naziv', order.name.slice(0, 100))
  push('kupac_adresa', buildBuyerAddress(order))

  const lines: { desc: string; qty: number; unitCents: number }[] = data.items.map((i) => ({
    desc: i.variant ? `${i.name} (${i.variant})` : i.name,
    qty: i.qty,
    unitCents: i.unitCents,
  }))
  if (data.shippingCents) {
    lines.push({
      desc: order.locale === 'en' ? 'Shipping' : 'Dostava',
      qty: 1,
      unitCents: data.shippingCents,
    })
  }
  const discountCents = data.discountCents || 0
  if (discountCents > 0) {
    lines.push({
      desc: order.locale === 'en' ? 'Discount 10%' : 'Popust 10%',
      qty: 1,
      unitCents: -discountCents,
    })
  }

  let n = 0
  for (const line of lines) {
    n++
    push('usluga', String(n))
    push(`opis_usluge_${n}`, line.desc.slice(0, 500))
    push(`jed_mjera_${n}`, '2') // kom — https://solo.com.hr/api-dokumentacija/jedinicne-mjere
    push(`cijena_${n}`, formatSoloAmount(line.unitCents))
    push(`kolicina_${n}`, String(line.qty))
    push(`popust_${n}`, '0')
    push(`porez_stopa_${n}`, '0')
  }
  push('ukupan_broj_usluga', String(n))
  push('nacin_placanja', paymentMethodCode(order.paymentMethod))
  const note = [
    `Firecase narudžba #${order.orderNumber}`,
    `E-mail: ${order.email}`,
    /paypal/i.test(order.paymentMethod || '') ? 'PayPal' : '',
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 1000)
  push('napomene', note)
  return parts.join('&')
}

async function postSolo(path: string, body: string, retries = 4): Promise<SoloJson> {
  let last: SoloJson = { status: -1, message: 'Nepoznata greška' }
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://api.solo.com.hr${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    })
    const json = (await res.json()) as SoloJson
    last = json
    if (json.status === 0) return json
    if (json.status === 100 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 11_000))
      continue
    }
    throw new Error(json.message || `Solo API greška (${json.status})`)
  }
  throw new Error(last.message || 'Solo API nije odgovorio.')
}

export async function createSoloInvoice(order: Order, data: InvoiceData): Promise<SoloCreateResult> {
  const body = buildSoloInvoiceBody(order, data)
  const json = await postSolo('/racun', body)
  const r = json.racun
  if (!r?.id || !r.broj_racuna) throw new Error('Solo nije vratio ID računa.')
  return {
    id: r.id,
    brojRacuna: r.broj_racuna,
    jir: r.jir || '',
    zki: r.zki || '',
    pdf: r.pdf || '',
  }
}

export async function stornoSoloInvoice(soloId: string) {
  const body = `token=${encodeURIComponent(soloToken())}&id=${encodeURIComponent(soloId)}`
  const json = await postSolo('/storno', body)
  if (json.status !== 0) throw new Error(json.message || 'Storno nije uspio.')
}

export async function fetchSoloPdf(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Preuzimanje PDF-a s Soloa nije uspjelo (${res.status}).`)
  return new Uint8Array(await res.arrayBuffer())
}
