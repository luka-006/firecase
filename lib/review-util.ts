import type { OrderItem } from './types'

/** Ime i inicijal prezimena, npr. "Ana Horvat" → "Ana H." */
export function defaultDisplayName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const first = parts[0].charAt(0).toLocaleUpperCase('hr') + parts[0].slice(1)
  if (parts.length === 1) return first.slice(0, 40)
  const initial = parts[parts.length - 1].charAt(0).toLocaleUpperCase('hr')
  return `${first} ${initial}.`.slice(0, 40)
}

export function cleanReviewName(raw: string) {
  return raw.replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
}

export function cleanReviewBody(raw: string) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1000)
}

export function safeImageSrc(url?: string) {
  if (!url) return ''
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' || u.protocol === 'http:') return url
  } catch {
    /* ignore */
  }
  return ''
}

export type ReviewTarget = {
  itemIndex: number
  productId: number
  name: string
  variant: string
  image?: string
  slug: string
  qty: number
}

/** Jedna ocjena po proizvodu i varijanti, ne po komadu. */
export function reviewTargets(items: OrderItem[]): ReviewTarget[] {
  const map = new Map<string, ReviewTarget>()
  items.forEach((item, itemIndex) => {
    if (!item.productId) return
    const key = `${item.productId}::${item.variant}`
    const prev = map.get(key)
    if (prev) {
      prev.qty += item.qty
      return
    }
    map.set(key, {
      itemIndex,
      productId: item.productId,
      name: item.name,
      variant: item.variant,
      image: item.image,
      slug: item.slug,
      qty: item.qty,
    })
  })
  return [...map.values()]
}
