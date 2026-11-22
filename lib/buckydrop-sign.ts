import { createHash } from 'node:crypto'

/** BuckyDrop OpenAPI signature for POST requests and webhooks: MD5(appCode + jsonBody + timestamp + appSecret), lowercase hex. */
export function buckydropSign(appCode: string, jsonBody: string, timestamp: string | number, appSecret: string) {
  return createHash('md5').update(appCode + jsonBody + String(timestamp) + appSecret, 'utf8').digest('hex')
}

/** Webhook check: same formula over the raw body exactly as received. */
export function buckydropSignOk(appCode: string, rawBody: string, timestamp: string, sign: string, appSecret: string) {
  if (!appCode || !timestamp || !sign || !appSecret) return false
  return buckydropSign(appCode, rawBody, timestamp, appSecret) === sign.toLowerCase()
}
