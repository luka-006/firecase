import 'server-only'

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY nije postavljen')
    return process.env.NODE_ENV !== 'production'
  }
  if (!token?.trim()) return false
  if (token === 'dev-bypass' && process.env.NODE_ENV !== 'production') return true
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean }
    return !!data.success
  } catch (e) {
    console.error('[turnstile]', (e as Error).message)
    return false
  }
}
