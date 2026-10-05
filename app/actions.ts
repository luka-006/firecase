'use server'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { clearUserSession, getUser, setUserSession } from '@/lib/auth'
import { t } from '@/lib/dict'
import { href, isLocale, type Locale } from '@/lib/routes'
import { getProductsByIds } from '@/lib/products'
import { getSettingsFresh, shippingFor } from '@/lib/settings'
import { stripe } from '@/lib/stripe'
import { newPublicId } from '@/lib/orders'
import { sendPasswordReset } from '@/lib/mail'
import { EU_COUNTRIES, SITE_URL } from '@/lib/config'
import type { OrderItem } from '@/lib/types'

type State = { error?: string; ok?: string } | null

const localeOf = (f: FormData): Locale => {
  const l = String(f.get('locale') || 'hr')
  return isLocale(l) ? l : 'hr'
}
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max)
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

// ---------- Blagajna ----------
const cartSchema = z.array(z.object({ id: z.number().int(), vi: z.number().int(), qty: z.number().int().min(1).max(99) })).min(1).max(50)

export async function startCheckout(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  let cart: z.infer<typeof cartSchema>
  try {
    cart = cartSchema.parse(JSON.parse(String(f.get('cart') || '[]')))
  } catch {
    return { error: d.errors.cartEmpty }
  }
  const c = {
    name: str(f, 'name'), email: str(f, 'email').toLowerCase(), phone: str(f, 'phone', 40),
    address: str(f, 'address'), city: str(f, 'city', 100), postal: str(f, 'postal', 20),
    country: str(f, 'country', 2).toUpperCase() || 'HR', note: str(f, 'note', 1000),
  }
  if (!c.name || !c.address || !c.city || !c.postal || !c.phone || !z.email().safeParse(c.email).success) return { error: d.errors.required }
  if (f.get('terms') !== 'on') return { error: d.errors.terms }

  const s = await getSettingsFresh()
  const allowed = s.shipEu ? EU_COUNTRIES : ['HR']
  if (!allowed.includes(c.country)) return { error: d.errors.country }

  const products = await getProductsByIds([...new Set(cart.map((i) => i.id))])
  const items: OrderItem[] = []
  for (const line of cart) {
    const p = products.find((x) => x.id === line.id)
    if (!p) return { error: d.errors.stock }
    const qtyInCart = cart.filter((x) => x.id === p.id).reduce((a, x) => a + x.qty, 0)
    if (p.stock !== null && p.stock < qtyInCart) return { error: d.errors.stock }
    const v = line.vi >= 0 ? p.variants[line.vi] : undefined
    if (line.vi >= 0 && !v) return { error: d.errors.stock }
    items.push({
      productId: p.id, slug: p.slug,
      name: locale === 'en' && p.nameEn ? p.nameEn : p.nameHr,
      variant: v ? (locale === 'en' && v.en ? v.en : v.hr) : '',
      qty: line.qty, unitCents: p.priceCents, image: p.images[0],
      supplierUrl: p.supplierUrl || '', supplierOption: v?.sup ?? '', costCents: p.costCents ?? null,
    })
  }
  const subtotal = items.reduce((a, i) => a + i.unitCents * i.qty, 0)
  const shipping = shippingFor(subtotal, c.country, s)
  const total = subtotal + shipping

  const st = stripe()
  if (!st) return { error: d.errors.payments }

  const user = await getUser()
  if (user && f.get('save') === 'on') {
    await sql`update users set name = ${c.name}, phone = ${c.phone}, address = ${c.address}, city = ${c.city},
      postal = ${c.postal}, country = ${c.country} where id = ${user.id}`
  }

  const publicId = newPublicId()
  const [order] = await sql<{ id: number }[]>`insert into orders ${sql({
    publicId, userId: user?.id ?? null, ...c, items: sql.json(items as never),
    subtotalCents: subtotal, shippingCents: shipping, totalCents: total, locale,
  })} returning id`

  let url: string | null = null
  try {
    const session = await st.checkout.sessions.create({
      mode: 'payment',
      locale: locale === 'hr' ? 'hr' : 'en',
      customer_email: c.email,
      client_reference_id: String(order.id),
      metadata: { orderId: String(order.id) },
      payment_intent_data: { metadata: { orderId: String(order.id) }, description: `Firecase #${order.id}` },
      line_items: [
        ...items.map((i) => ({
          quantity: i.qty,
          price_data: { currency: 'eur', unit_amount: i.unitCents, product_data: { name: i.variant ? `${i.name} (${i.variant})` : i.name } },
        })),
        ...(shipping > 0
          ? [{ quantity: 1, price_data: { currency: 'eur', unit_amount: shipping, product_data: { name: d.shipping } } }]
          : []),
      ],
      success_url: `${SITE_URL}${href(locale, 'order', publicId)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${href(locale, 'checkout')}`,
    })
    await sql`update orders set stripe_session_id = ${session.id} where id = ${order.id}`
    url = session.url
  } catch (e) {
    console.error('[checkout]', (e as Error).message)
    return { error: d.errors.payments }
  }
  if (!url) return { error: d.errors.payments }
  redirect(url)
}

// ---------- Korisnički račun ----------
export async function register(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  const email = str(f, 'email').toLowerCase()
  const password = String(f.get('password') || '')
  if (!z.email().safeParse(email).success) return { error: d.errors.required }
  if (password.length < 8) return { error: d.errors.password }
  const exists = await sql`select 1 from users where email = ${email}`
  if (exists.length) return { error: d.errors.emailTaken }
  const [u] = await sql<{ id: number }[]>`insert into users (email, password_hash, name)
    values (${email}, ${await bcrypt.hash(password, 10)}, ${str(f, 'name')}) returning id`
  await setUserSession({ id: u.id, email })
  redirect(href(locale, 'account'))
}

export async function login(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const email = str(f, 'email').toLowerCase()
  const [u] = await sql<{ id: number; passwordHash: string }[]>`select id, password_hash from users where email = ${email}`
  const ok = u && (await bcrypt.compare(String(f.get('password') || ''), u.passwordHash))
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400))
    return { error: t(locale).errors.invalid }
  }
  await setUserSession({ id: u.id, email })
  redirect(href(locale, 'account'))
}

export async function logout(f: FormData) {
  await clearUserSession()
  redirect(href(localeOf(f), 'home'))
}

export async function forgotPassword(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const email = str(f, 'email').toLowerCase()
  const token = crypto.randomBytes(32).toString('base64url')
  const rows = await sql`update users set reset_token = ${sha(token)}, reset_expires = now() + interval '1 hour'
    where email = ${email} returning id`
  if (rows.length) {
    await sendPasswordReset(email, `${SITE_URL}${href(locale, 'reset', undefined, `token=${token}`)}`, locale === 'en')
  }
  return { ok: t(locale).linkSent }
}

export async function resetPassword(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  const password = String(f.get('password') || '')
  if (password.length < 8) return { error: d.errors.password }
  const rows = await sql`update users set password_hash = ${await bcrypt.hash(password, 10)}, reset_token = null, reset_expires = null
    where reset_token = ${sha(String(f.get('token') || ''))} and reset_expires > now() returning id`
  if (!rows.length) return { error: d.errors.token }
  return { ok: d.resetDone }
}

export async function saveProfile(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const user = await getUser()
  if (!user) redirect(href(locale, 'login'))
  await sql`update users set name = ${str(f, 'name')}, phone = ${str(f, 'phone', 40)}, address = ${str(f, 'address')},
    city = ${str(f, 'city', 100)}, postal = ${str(f, 'postal', 20)}, country = ${str(f, 'country', 2).toUpperCase() || 'HR'}
    where id = ${user.id}`
  return { ok: t(locale).saved }
}

export async function deleteAccount(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const user = await getUser()
  if (user) await sql`delete from users where id = ${user.id}`
  await clearUserSession()
  redirect(href(locale, 'home'))
}

// ---------- Favoriti ----------
export async function favoriteState(productId: number) {
  const user = await getUser()
  if (!user) return { loggedIn: false, fav: false }
  const rows = await sql`select 1 from favorites where user_id = ${user.id} and product_id = ${productId}`
  return { loggedIn: true, fav: rows.length > 0 }
}

export async function toggleFavorite(productId: number) {
  const user = await getUser()
  if (!user) return { loggedIn: false, fav: false }
  const del = await sql`delete from favorites where user_id = ${user.id} and product_id = ${productId} returning 1`
  if (del.length) return { loggedIn: true, fav: false }
  await sql`insert into favorites (user_id, product_id) values (${user.id}, ${productId}) on conflict do nothing`
  return { loggedIn: true, fav: true }
}
