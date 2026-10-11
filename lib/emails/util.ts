import { SITE_URL } from '../config'

export function absImageUrl(url?: string) {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`
}
