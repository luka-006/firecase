import crypto from 'node:crypto'

/** HMAC-SHA256 of the raw body, Base64, secret = openId string. */
export function supplierWebhookSign(openId: string, rawBody: string) {
  return crypto.createHmac('sha256', openId).update(rawBody, 'utf8').digest('base64')
}

export function supplierWebhookSignOk(openId: string, rawBody: string, headerSign: string) {
  if (!openId || !headerSign) return false
  const expected = supplierWebhookSign(openId, rawBody)
  const a = Buffer.from(expected)
  const b = Buffer.from(headerSign)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
