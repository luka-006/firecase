'use server'
import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { clearAdminSession, isAdmin, requireAdmin, setAdminSession } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { fiscalize, getInvoicesForOrder, issueInvoice } from '@/lib/invoice'
import { renderInvoicePdf } from '@/lib/invoice/pdf'
import { loadCert } from '@/lib/invoice/fiscal'
import { sendRefunded, sendShipped } from '@/lib/mail'
import { saveSettings, type Settings } from '@/lib/settings'
import { SCHEMA } from '@/lib/schema.mjs'
import type { Invoice, Order, Variant } from '@/lib/types'

type State = { error?: string; ok?: string } | null
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const cents = (v: string) => {
  const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
const slugify = (s: string) =>
  s.toLowerCase().replace(/[čć]/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

function refresh() {
  updateTag('products')
  revalidatePath('/[locale]', 'layout')
}

export async function adminLogin(_: State, f: FormData): Promise<State> {
  const expected = process.env.ADMIN_PASSWORD
  const given = str(f, 'password')
  const ok = !!expected && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600))
    return { error: expected ? 'Pogrešna lozinka.' : 'ADMIN_PASSWORD nije postavljen u Vercelu.' }
  }
  await setAdminSession()
  redirect('/admin')
}

export async function adminLogout() {
  await clearAdminSession()
  redirect('/admin/login')
}

// ---------- Automatski prijevod HR -> EN (DeepL) ----------
export async function translateToEn(text: string): Promise<{ ok: true; text: string } | { ok: false; error: string; disabled?: boolean }> {
  if (!(await isAdmin())) return { ok: false, error: 'Niste prijavljeni.' }
  const key = process.env.DEEPL_API_KEY
  if (!key) return { ok: false, error: 'Automatski prijevod nije uključen (DEEPL_API_KEY).', disabled: true }
  if (!text.trim()) return { ok: true, text: '' }
  const url = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [text.slice(0, 5000)], source_lang: 'HR', target_lang: 'EN-GB', preserve_formatting: true }),
    })
    if (!res.ok) return { ok: false, error: `DeepL ${res.status}: ${(await res.text()).slice(0, 160)}` }
    const data = (await res.json()) as { translations?: { text: string }[] }
    return { ok: true, text: data.translations?.[0]?.text ?? '' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- Baza ----------
export async function runMigrations() {
  await requireAdmin()
  await sql.unsafe(SCHEMA)
  revalidatePath('/admin', 'layout')
}

// ---------- Proizvodi ----------
export async function saveProduct(_: State, f: FormData): Promise<State> {
  await requireAdmin()
  const id = Number(f.get('id')) || null
  const nameHr = str(f, 'nameHr')
  const price = cents(str(f, 'price'))
  if (!nameHr || price === null || price <= 0) return { error: 'Naziv (HR) i cijena su obavezni.' }
  const compare = str(f, 'compare') ? cents(str(f, 'compare')) : null
  if (compare !== null && compare <= price) return { error: 'Stara cijena mora biti veća od nove (ili ostavi prazno).' }
  let images: string[] = []
  try { images = JSON.parse(str(f, 'images') || '[]') } catch {}
  const variants: Variant[] = str(f, 'variants').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => { const [hr, en, sup] = l.split('|').map((x) => x.trim()); return sup ? { hr, en: en || hr, sup } : { hr, en: en || hr } })
  const stockRaw = str(f, 'stock')
  const data = {
    slug: slugify(str(f, 'slug') || nameHr),
    nameHr, nameEn: str(f, 'nameEn'),
    shortHr: str(f, 'shortHr'), shortEn: str(f, 'shortEn'),
    descHr: str(f, 'descHr'), descEn: str(f, 'descEn'),
    priceCents: price, compareCents: compare,
    images: sql.json(images), variants: sql.json(variants as never),
    stock: stockRaw === '' ? null : Math.max(0, parseInt(stockRaw, 10) || 0),
    active: f.get('active') === 'on', featured: f.get('featured') === 'on', sort: parseInt(str(f, 'sort'), 10) || 0,
    sku: str(f, 'sku'), materialHr: str(f, 'materialHr'), materialEn: str(f, 'materialEn'),
    manufacturer: str(f, 'manufacturer'), euResponsible: str(f, 'euResponsible'),
    supplierUrl: str(f, 'supplierUrl'), costCents: str(f, 'cost') ? cents(str(f, 'cost')) : null,
    safetyHr: str(f, 'safetyHr'), safetyEn: str(f, 'safetyEn'),
  }
  if (!data.slug) return { error: 'Neispravan URL (slug).' }
  try {
    if (id) {
      const [old] = await sql<{ priceCents: number }[]>`select price_cents from products where id = ${id}`
      await sql`update products set ${sql(data)}, updated_at = now() where id = ${id}`
      if (old && old.priceCents !== price) await sql`insert into price_history (product_id, price_cents) values (${id}, ${price})`
    } else {
      const [row] = await sql<{ id: number }[]>`insert into products ${sql(data)} returning id`
      await sql`insert into price_history (product_id, price_cents) values (${row.id}, ${price})`
      refresh()
      redirect(`/admin/products/${row.id}?saved=1`)
    }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
    if ((e as { code?: string }).code === '23505') return { error: 'Proizvod s tim URL-om (slug) već postoji.' }
    return { error: `Baza: ${(e as Error).message}` }
  }
  refresh()
  return { ok: 'Spremljeno.' }
}

export async function deleteProduct(f: FormData) {
  await requireAdmin()
  await sql`delete from products where id = ${Number(f.get('id'))}`
  refresh()
  redirect('/admin/products')
}

export async function toggleProduct(f: FormData) {
  await requireAdmin()
  await sql`update products set active = not active where id = ${Number(f.get('id'))}`
  refresh()
  revalidatePath('/admin/products')
}

// ---------- Narudžbe ----------
async function orderOf(f: FormData) {
  await requireAdmin()
  const [o] = await sql<Order[]>`select * from orders where id = ${Number(f.get('id'))}`
  if (!o) throw new Error('Narudžba ne postoji')
  return o
}

export async function markShipped(f: FormData) {
  const o = await orderOf(f)
  const [u] = await sql<Order[]>`update orders set status = 'shipped', shipped_at = now(), tracking = ${str(f, 'tracking')}
    where id = ${o.id} and status in ('paid', 'shipped') returning *`
  if (u) await sendShipped(u)
  revalidatePath(`/admin/orders/${o.id}`)
}

export async function setSupplierOrder(f: FormData) {
  const o = await orderOf(f)
  await sql`update orders set supplier_order = ${str(f, 'supplierOrder').slice(0, 80)} where id = ${o.id}`
  revalidatePath(`/admin/orders/${o.id}`)
  revalidatePath('/admin/orders')
}

export async function markDelivered(f: FormData) {
  const o = await orderOf(f)
  await sql`update orders set status = 'delivered' where id = ${o.id} and status = 'shipped'`
  revalidatePath(`/admin/orders/${o.id}`)
}

export async function cancelPending(f: FormData) {
  const o = await orderOf(f)
  await sql`update orders set status = 'cancelled' where id = ${o.id} and status = 'pending'`
  revalidatePath(`/admin/orders/${o.id}`)
}

export async function refundOrder(_: State, f: FormData): Promise<State> {
  const o = await orderOf(f)
  if (!['paid', 'shipped', 'delivered'].includes(o.status)) return { error: 'Narudžba nije u statusu za povrat.' }
  const s = stripe()
  if (!s || !o.stripePaymentIntent) return { error: 'Stripe nije postavljen ili nema plaćanja.' }
  try {
    await s.refunds.create({ payment_intent: o.stripePaymentIntent })
  } catch (e) {
    return { error: `Stripe: ${(e as Error).message}` }
  }
  const [u] = await sql<Order[]>`update orders set status = 'refunded' where id = ${o.id} returning *`
  const original = (await getInvoicesForOrder(o.id)).find((i) => !i.stornoOf)
  let pdf: { number: string; pdf: Uint8Array } | undefined
  if (original) {
    const storno = await issueInvoice(u, original)
    pdf = { number: storno.number, pdf: await renderInvoicePdf(storno) }
  }
  await sendRefunded(u, pdf)
  revalidatePath(`/admin/orders/${o.id}`)
  return { ok: 'Novac je vraćen' + (original ? ' i izdan je storno račun.' : '.') }
}

export async function issueMissingInvoice(f: FormData) {
  const o = await orderOf(f)
  const existing = await getInvoicesForOrder(o.id)
  if (!existing.length && o.status !== 'pending' && o.status !== 'cancelled') await issueInvoice(o)
  revalidatePath(`/admin/orders/${o.id}`)
}

export async function retryFiscal(f: FormData) {
  await requireAdmin()
  const [inv] = await sql<Invoice[]>`select * from invoices where id = ${Number(f.get('id'))}`
  if (inv && inv.fiscalStatus !== 'ok') await fiscalize(inv)
  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/orders/${inv?.orderId}`)
}

// ---------- Postavke ----------
export async function saveSettingsAction(_: State, f: FormData): Promise<State> {
  await requireAdmin()
  const shipping = cents(str(f, 'shipping'))
  const threshold = cents(str(f, 'threshold'))
  const eu = cents(str(f, 'euShipping'))
  if (shipping === null || threshold === null || eu === null) return { error: 'Neispravni iznosi.' }
  const premises = str(f, 'premises').replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
  const device = str(f, 'device').replace(/[^0-9]/g, '').slice(0, 6)
  if (!premises || !device) return { error: 'Oznaka poslovnog prostora i naplatnog uređaja su obavezne.' }
  const s: Settings = {
    shippingCents: shipping, freeThresholdCents: threshold, shipEu: f.get('shipEu') === 'on', euShippingCents: eu,
    deliveryHr: str(f, 'deliveryHr'), deliveryEn: str(f, 'deliveryEn'),
    announcementHr: str(f, 'announcementHr'), announcementEn: str(f, 'announcementEn'),
    fiscalEnabled: f.get('fiscalEnabled') === 'on', fiscalEnv: str(f, 'fiscalEnv') === 'prod' ? 'prod' : 'test',
    premises, device, seqMode: str(f, 'seqMode') === 'N' ? 'N' : 'P',
  }
  if (s.fiscalEnabled) {
    try { loadCert() } catch (e) { return { error: `Fiskalizacija se ne može uključiti: ${(e as Error).message}` } }
  }
  try {
    await saveSettings(s)
  } catch (e) {
    return { error: `Baza: ${(e as Error).message}` }
  }
  updateTag('settings')
  revalidatePath('/[locale]', 'layout')
  return { ok: 'Postavke su spremljene.' }
}

export async function checkCertificate(_: State): Promise<State> {
  if (!(await isAdmin())) return { error: 'Niste prijavljeni.' }
  try {
    const c = loadCert()
    return { ok: `Certifikat OK · ${c.subject} · vrijedi do ${c.validTo.toLocaleDateString('hr-HR')}` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
