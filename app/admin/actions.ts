'use server'
import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { clearAdminSession, isAdmin, requireAdmin, setAdminSession } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { ensureOrderInvoice, getInvoicesForOrder, retryIssueInvoice, stornoOrderInvoice } from '@/lib/invoice'
import { adjustOrderStock } from '@/lib/stock-db'
import { sendRefunded, sendShipped } from '@/lib/mail'
import { deliverReviewRequest } from '@/lib/review-mail'
import { logShippedEmail } from '@/lib/mail/order-email-log'
import { saveSettings, type Settings } from '@/lib/settings'
import { SCHEMA } from '@/lib/schema.mjs'
import type { Invoice, Order, Variant } from '@/lib/types'
import { parseVariantLine } from '@/lib/variants'

type State = { error?: string; ok?: string } | null
const str = (f: FormData, k: string, max = 5000) => String(f.get(k) ?? '').trim().slice(0, max)
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
  const priceRaw = str(f, 'price')
  const price = priceRaw === '' ? 0 : cents(priceRaw)
  const wantActive = f.get('active') === 'on'
  if (!nameHr || price === null || price < 0) return { error: 'Naziv (HR) i cijena su obavezni.' }
  if (price <= 0 && wantActive) return { error: 'Prije objave upišite prodajnu cijenu veću od 0 €.' }
  if (price === 0 && !wantActive) {
    /* neobjavljeni proizvod iz prijedloga */
  } else if (price <= 0) return { error: 'Neispravna cijena.' }
  const compare = str(f, 'compare') ? cents(str(f, 'compare')) : null
  if (compare !== null && compare <= price) return { error: 'Stara cijena mora biti veća od nove (ili ostavi prazno).' }
  let images: string[] = []
  try { images = JSON.parse(str(f, 'images') || '[]') } catch {}
  const variants: Variant[] = str(f, 'variants').split('\n').map((l) => parseVariantLine(l)).filter((v): v is Variant => !!v)
  const stockRaw = str(f, 'stock')
  const proposalId = Number(f.get('proposalId')) || null
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
    ...(proposalId ? { proposalId } : {}),
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
      if (proposalId) {
        await sql`update product_proposals set status = 'accepted', product_id = ${row.id}, updated_at = now() where id = ${proposalId}`
      }
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

// ---------- Prijedlozi proizvoda ----------
export async function rejectProposal(_: State, f: FormData): Promise<State> {
  await requireAdmin()
  const id = Number(f.get('id'))
  const reason = str(f, 'reason', 2000)
  if (!reason) return { error: 'Upišite razlog odbijanja.' }
  await sql`
    update product_proposals set status = 'rejected', reject_reason = ${reason}, updated_at = now()
    where id = ${id} and status in ('review', 'draft')`
  revalidatePath('/admin/prijedlozi')
  revalidatePath(`/admin/prijedlozi/${id}`)
  return { ok: 'Prijedlog je odbijen.' }
}

export async function acceptProposal(f: FormData) {
  await requireAdmin()
  const id = Number(f.get('id'))
  redirect(`/admin/products/new?proposal=${id}`)
}

export async function toggleProduct(f: FormData) {
  await requireAdmin()
  const id = Number(f.get('id'))
  const [p] = await sql<{ active: boolean; priceCents: number }[]>`select active, price_cents from products where id = ${id}`
  if (p && !p.active && p.priceCents <= 0) return
  await sql`update products set active = not active where id = ${id}`
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

export async function confirmShipment(f: FormData) {
  const o = await orderOf(f)
  if (o.status !== 'paid') return
  const [u] = await sql<Order[]>`
    update orders set status = 'shipped', shipped_at = now()
    where id = ${o.id} and status = 'paid' returning *`
  if (!u) return
  const mail = await sendShipped(u)
  await logShippedEmail(u.id, mail.ok ? { ok: true } : { ok: false, error: mail.error })
  revalidatePath(`/admin/orders/${o.id}`)
  revalidatePath('/admin/orders')
}

/** Odmah pošalji zahtjev za recenziju (test). Cron inače šalje jednom, 14 dana nakon slanja. */
export async function sendReviewRequestAction(_: State, f: FormData): Promise<State> {
  const o = await orderOf(f)
  const result = await deliverReviewRequest(o, { force: true })
  revalidatePath(`/admin/orders/${o.id}`)
  if (!result.ok) return { error: result.error }
  return { ok: 'Zahtjev za recenziju je poslan.' }
}

export async function moderateReview(f: FormData) {
  await requireAdmin()
  const id = Number(f.get('id'))
  const op = str(f, 'op')
  if (!id) return
  if (op === 'delete') await sql`delete from reviews where id = ${id}`
  else if (op === 'approve') await sql`update reviews set status = 'approved', moderated_at = now() where id = ${id}`
  else if (op === 'reject') await sql`update reviews set status = 'rejected', moderated_at = now() where id = ${id}`
  else return
  updateTag('reviews')
  revalidatePath('/[locale]', 'layout')
  revalidatePath('/admin/reviews')
}

/** Eksplicitno ponovno slanje e-maila o slanju. */
export async function resendShippedEmail(f: FormData) {
  const o = await orderOf(f)
  if (o.status !== 'shipped') return
  const mail = await sendShipped(o)
  await logShippedEmail(o.id, mail.ok ? { ok: true } : { ok: false, error: mail.error })
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
  const [cancelled] = await sql<{ id: number }[]>`update orders set status = 'cancelled' where id = ${o.id} and status = 'pending' returning id`
  if (cancelled) await adjustOrderStock(o.id, 'give')
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
  await adjustOrderStock(u.id, 'give')
  const storno = await stornoOrderInvoice(u)
  const mail = await sendRefunded(u)
  if (!mail.ok) console.error('[mail] povrat novca', o.id, mail.error)
  revalidatePath(`/admin/orders/${o.id}`)
  const stornoNote = storno.ok
    ? ' Solo storno je poslan.'
    : storno.manual
      ? ' Storno u Soloa provjerite ručno.'
      : ''
  return { ok: 'Novac je vraćen.' + stornoNote + (mail.ok ? '' : ' (e-mail kupcu nije poslan – provjeri Resend.)') }
}

export async function issueMissingInvoice(f: FormData) {
  const o = await orderOf(f)
  const existing = await getInvoicesForOrder(o.id)
  if (!existing.length && o.status !== 'pending' && o.status !== 'cancelled') await ensureOrderInvoice(o)
  revalidatePath(`/admin/orders/${o.id}`)
}

export async function retryIssueInvoiceAction(f: FormData) {
  await requireAdmin()
  const id = Number(f.get('id'))
  const inv = await retryIssueInvoice(id, { manual: true })
  revalidatePath('/admin/invoices')
  if (inv) revalidatePath(`/admin/orders/${inv.orderId}`)
}

// ---------- Postavke ----------
export async function saveSettingsAction(_: State, f: FormData): Promise<State> {
  await requireAdmin()
  const shipping = cents(str(f, 'shipping'))
  const threshold = cents(str(f, 'threshold'))
  const eu = cents(str(f, 'euShipping'))
  if (shipping === null || threshold === null || eu === null) return { error: 'Neispravni iznosi.' }
  const s: Settings = {
    shippingCents: shipping, freeThresholdCents: threshold, shipEu: f.get('shipEu') === 'on', euShippingCents: eu,
    deliveryHr: str(f, 'deliveryHr'), deliveryEn: str(f, 'deliveryEn'),
    announcementHr: str(f, 'announcementHr'), announcementEn: str(f, 'announcementEn'),
    autoAcceptProposals: f.get('autoAcceptProposals') === 'on',
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

