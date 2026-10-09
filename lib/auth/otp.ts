import 'server-only'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { sql } from '../db'
import { checkRateLimit, hitRateLimit, clearRateLimit } from './rate-limit'

const OTP_TTL_MIN = 10
const OTP_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SEC = 60

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

function code6() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function createEmailOtp(email: string, ip: string) {
  const normalized = email.trim().toLowerCase()
  const ipKey = sha(ip || 'unknown')

  const emailLimit = await checkRateLimit('otp_send_email', normalized, { maxHits: 8, windowSec: 3600, lockoutSec: 3600 })
  if (!emailLimit.ok) return { ok: false as const, reason: 'rate_email' as const, retryAfterSec: emailLimit.retryAfterSec }

  const ipLimit = await checkRateLimit('otp_send_ip', ipKey, { maxHits: 30, windowSec: 3600, lockoutSec: 1800 })
  if (!ipLimit.ok) return { ok: false as const, reason: 'rate_ip' as const, retryAfterSec: ipLimit.retryAfterSec }

  const cooldown = await checkRateLimit('otp_resend', normalized, { maxHits: 1, windowSec: RESEND_COOLDOWN_SEC })
  if (!cooldown.ok) return { ok: false as const, reason: 'cooldown' as const, retryAfterSec: cooldown.retryAfterSec }

  await hitRateLimit('otp_resend', normalized, { maxHits: 1, windowSec: RESEND_COOLDOWN_SEC })

  const plain = code6()
  const codeHash = await bcrypt.hash(plain, 10)
  await sql`
    insert into email_otp_codes (email, purpose, code_hash, expires_at, ip_hash)
    values (${normalized}, 'auth', ${codeHash}, now() + interval '10 minutes', ${ipKey})`
  return { ok: true as const, code: plain, email: normalized }
}

export async function verifyEmailOtp(email: string, code: string) {
  const normalized = email.trim().toLowerCase()
  const [row] = await sql<
    { id: number; codeHash: string; attempts: number; expiresAt: Date }[]
  >`select id, code_hash, attempts, expires_at from email_otp_codes
    where email = ${normalized} and purpose = 'auth' and expires_at > now()
    order by created_at desc limit 1`
  if (!row) return { ok: false as const, reason: 'invalid' as const }
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, reason: 'locked' as const }

  const match = await bcrypt.compare(code.trim(), row.codeHash)
  if (!match) {
    await sql`update email_otp_codes set attempts = attempts + 1 where id = ${row.id}`
    return { ok: false as const, reason: 'invalid' as const }
  }
  await sql`delete from email_otp_codes where id = ${row.id}`
  await clearRateLimit('otp_resend', normalized)
  return { ok: true as const, email: normalized }
}
