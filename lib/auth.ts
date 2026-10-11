import 'server-only'
import crypto from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const USER_COOKIE = 'fc_session'
const ADMIN_COOKIE = 'fc_admin'
const STAFF_COOKIE = 'fc_staff'

function key() {
  const s = process.env.AUTH_SECRET
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET nije postavljen')
  return new TextEncoder().encode(s || 'dev-only-secret-dev-only-secret-dev-only')
}

async function sign(payload: Record<string, unknown>, exp: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(key())
}

async function verify(token?: string) {
  if (!token) return null
  try {
    return (await jwtVerify(token, key())).payload
  } catch {
    return null
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge,
})

export async function getUser(): Promise<{ id: number; email: string } | null> {
  const p = await verify((await cookies()).get(USER_COOKIE)?.value)
  return p && typeof p.uid === 'number' ? { id: p.uid, email: String(p.email) } : null
}

export async function setUserSession(user: { id: number; email: string }) {
  const token = await sign({ uid: user.id, email: user.email }, '30d')
  ;(await cookies()).set(USER_COOKIE, token, cookieOpts(60 * 60 * 24 * 30))
}

export async function clearUserSession() {
  ;(await cookies()).delete(USER_COOKIE)
}

export async function isAdmin() {
  const p = await verify((await cookies()).get(ADMIN_COOKIE)?.value)
  return p?.role === 'admin'
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login')
}

export async function setAdminSession() {
  ;(await cookies()).set(ADMIN_COOKIE, await sign({ role: 'admin' }, '12h'), cookieOpts(60 * 60 * 12))
}

export async function clearAdminSession() {
  ;(await cookies()).delete(ADMIN_COOKIE)
}

export async function isStaff() {
  const p = await verify((await cookies()).get(STAFF_COOKIE)?.value)
  return p?.role === 'staff'
}

export async function requireStaff() {
  if (!(await isStaff())) redirect('/staff/login')
}

export async function setStaffSession() {
  ;(await cookies()).set(STAFF_COOKIE, await sign({ role: 'staff' }, '12h'), cookieOpts(60 * 60 * 12))
}

export async function clearStaffSession() {
  ;(await cookies()).delete(STAFF_COOKIE)
}

export function staffApiAuthorized(req: Request) {
  const expected = process.env.STAFF_API_TOKEN
  if (!expected) return false
  const h = req.headers.get('authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  if (!m) return false
  const given = m[1]
  if (given.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  } catch {
    return false
  }
}
