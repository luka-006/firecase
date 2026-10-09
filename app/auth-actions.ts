'use server'

import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { setUserSession } from '@/lib/auth'
import { createEmailOtp, verifyEmailOtp } from '@/lib/auth/otp'
import { verifyTurnstile } from '@/lib/auth/turnstile'
import { clientIpFromHeaders } from '@/lib/client-ip'
import { t } from '@/lib/dict'
import { href, isLocale, type Locale } from '@/lib/routes'
import { sendOtpCode } from '@/lib/mail'

type State = { error?: string; ok?: string; step?: 'code' } | null

const localeOf = (f: FormData): Locale => {
  const l = String(f.get('locale') || 'hr')
  return isLocale(l) ? l : 'hr'
}
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max)

async function ip() {
  return clientIpFromHeaders(await headers())
}

async function checkTurnstile(f: FormData, locale: Locale) {
  const token = str(f, 'cf-turnstile-response', 5000)
  const ok = await verifyTurnstile(token, await ip())
  if (!ok) return t(locale).mailOtpTurnstile
  return null
}

export async function sendAuthCode(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  const tsErr = await checkTurnstile(f, locale)
  if (tsErr) return { error: tsErr }
  const email = str(f, 'email').toLowerCase()
  if (!z.email().safeParse(email).success) return { error: d.errors.required }

  const otp = await createEmailOtp(email, await ip())
  if (!otp.ok) {
    if (otp.reason === 'cooldown' || otp.reason === 'rate_email' || otp.reason === 'rate_ip') {
      const sec = otp.retryAfterSec ?? 60
      return { error: d.mailOtpResendWait(sec) }
    }
    return { error: d.errors.generic }
  }
  const mail = await sendOtpCode(otp.email, otp.code, locale)
  if (!mail.ok) console.error('[mail] otp', mail.error)
  return { ok: d.mailOtpSent, step: 'code' }
}

export async function verifyAuthCode(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  const mode = str(f, 'mode') === 'register' ? 'register' : 'login'
  const email = str(f, 'email').toLowerCase()
  const code = str(f, 'code', 6)
  const name = str(f, 'name', 120)
  if (!z.email().safeParse(email).success || code.length !== 6) return { error: d.errors.required }

  const v = await verifyEmailOtp(email, code)
  if (!v.ok) {
    if (v.reason === 'locked') return { error: d.mailOtpLocked }
    return { error: d.mailOtpInvalid }
  }

  const [existing] = await sql<{ id: number; passwordHash: string | null }[]>`
    select id, password_hash from users where email = ${email}`
  if (existing) {
    await sql`update users set email_verified_at = coalesce(email_verified_at, now()) where id = ${existing.id}`
    await setUserSession({ id: existing.id, email })
    redirect(href(locale, 'account'))
  }

  if (mode === 'login') {
    return { error: d.mailOtpInvalid }
  }
  if (!name) return { error: d.authRegisterNameRequired }

  const [u] = await sql<{ id: number }[]>`
    insert into users (email, password_hash, name, email_verified_at)
    values (${email}, null, ${name}, now()) returning id`
  await setUserSession({ id: u.id, email })
  redirect(href(locale, 'account'))
}

export async function loginWithPassword(_: State, f: FormData): Promise<State> {
  const locale = localeOf(f)
  const d = t(locale)
  const tsErr = await checkTurnstile(f, locale)
  if (tsErr) return { error: tsErr }
  const email = str(f, 'email').toLowerCase()
  const [u] = await sql<{ id: number; passwordHash: string | null }[]>`
    select id, password_hash from users where email = ${email}`
  const hash = u?.passwordHash
  const ok = hash && (await bcrypt.compare(String(f.get('password') || ''), hash))
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400))
    return { error: d.errors.invalid }
  }
  await setUserSession({ id: u!.id, email })
  redirect(href(locale, 'account'))
}
