import crypto from 'node:crypto'

// Each staff assistant has its own token, so one can be revoked without cutting off the other.
export const STAFF_TOKEN_VARS = ['STAFF_API_TOKEN', 'STAFF_API_TOKEN_CLAUDE'] as const

/** True when the Authorization header carries one of the configured staff tokens. */
export function staffTokenMatches(authorization: string | null, env: Record<string, string | undefined> = process.env) {
  const m = /^Bearer\s+(.+)$/i.exec(authorization || '')
  if (!m) return false
  const given = m[1]
  return STAFF_TOKEN_VARS.some((name) => {
    const expected = env[name]
    if (!expected) return false
    if (given.length !== expected.length) return false
    try {
      return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
    } catch {
      return false
    }
  })
}
