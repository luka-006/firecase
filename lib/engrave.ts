/** Membership is this flag, not the product name. */
export function isEngravingCase(p: { kind?: string | null; engrave?: boolean | null; active?: boolean }) {
  return p.engrave === true && p.kind !== 'set' && p.active !== false
}

export function catalogueEngravers<T extends { kind?: string | null; engrave?: boolean | null; active?: boolean }>(products: T[]) {
  return products.filter(isEngravingCase)
}

export const ENGRAVING_MAX = 16

/** Plain English letters and spaces. Č Ć Š Ž Đ, digits and punctuation are rejected. */
export function engravingText(raw: string): { ok: true; text: string } | { ok: false } {
  const text = String(raw ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!text) return { ok: true, text: '' }
  if (text.length > ENGRAVING_MAX) return { ok: false }
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(text)) return { ok: false }
  return { ok: true, text }
}
