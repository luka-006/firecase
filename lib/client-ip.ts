export function clientIpFromHeaders(h: Headers) {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}
