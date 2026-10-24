import type { Variant } from './types'

export function parseVariantLine(line: string): Variant | null {
  const parts = line.split('|').map((part) => part.trim())
  const hr = parts[0]
  if (!hr) return null
  const en = parts[1] || hr
  const sup = parts[2] || ''
  const variant: Variant = sup ? { hr, en, sup } : { hr, en }
  if (parts.length > 3 && parts[3] !== '') {
    const n = Number.parseInt(parts[3], 10)
    if (Number.isFinite(n)) variant.stock = Math.max(0, n)
  }
  return variant
}

export function formatVariantLine(v: Variant) {
  const hasStock = typeof v.stock === 'number'
  if (!v.sup && !hasStock) return v.en && v.en !== v.hr ? `${v.hr} | ${v.en}` : v.hr
  const parts = [v.hr, v.en || v.hr]
  if (v.sup || hasStock) parts.push(v.sup || '')
  if (hasStock) parts.push(String(v.stock))
  return parts.join(' | ')
}

/** Staff red: HR | EN | opcija | SKU | bilješka. Zaliha nije u ovom retku. */
export function parseStaffVariantLine(line: string): Variant | null {
  const parts = line.split('|').map((part) => part.trim())
  const hr = parts[0]
  if (!hr) return null
  const variant: Variant = { hr, en: parts[1] || hr }
  if (parts[2]) variant.sup = parts[2]
  if (parts[3]) variant.supplierSku = parts[3]
  const note = parts.slice(4).join(' | ').trim()
  if (note) variant.supplierNote = note
  return variant
}

export function formatStaffVariantLine(v: Variant) {
  const en = v.en || v.hr
  const sup = v.sup || ''
  const sku = v.supplierSku || ''
  const note = v.supplierNote || ''
  if (!sup && !sku && !note) return en !== v.hr ? `${v.hr} | ${en}` : v.hr
  const parts = [v.hr, en, sup]
  if (sku || note) parts.push(sku)
  if (note) parts.push(note)
  return parts.join(' | ')
}

export function cleanVariant(raw: unknown): Variant | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const hr = String(o.hr ?? '').trim()
  if (!hr) return null
  const variant: Variant = { hr, en: String(o.en ?? '').trim() || hr }
  const sup = String(o.sup ?? '').trim().slice(0, 200)
  const supplierSku = String(o.supplierSku ?? '').trim().slice(0, 120)
  const supplierNote = String(o.supplierNote ?? '').trim().slice(0, 500)
  if (sup) variant.sup = sup
  if (supplierSku) variant.supplierSku = supplierSku
  if (supplierNote) variant.supplierNote = supplierNote
  if (o.stock !== undefined && o.stock !== null && String(o.stock).trim() !== '') {
    const n = Number.parseInt(String(o.stock), 10)
    if (Number.isFinite(n)) variant.stock = Math.max(0, n)
  }
  return variant
}

/** Admin forma šalje JSON. Stari redak HR | EN | opcija | zaliha i dalje prolazi. */
export function variantsFromAdminForm(raw: string): Variant[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('INVALID_VARIANTS')
    }
    if (!Array.isArray(parsed)) throw new Error('INVALID_VARIANTS')
    return parsed.map(cleanVariant).filter((v): v is Variant => !!v)
  }
  return trimmed.split('\n').map((line) => parseVariantLine(line)).filter((v): v is Variant => !!v)
}

/** Javna stranica vidi samo naziv i zalihu. */
export function publicVariants(variants: Variant[]): Variant[] {
  return variants.map((v) => {
    const out: Variant = { hr: v.hr, en: v.en }
    if (typeof v.stock === 'number') out.stock = v.stock
    return out
  })
}

const filled = (value?: string | null) => (value ?? '').trim()
const norm = (value?: string | null) => filled(value).toLowerCase()

/**
 * Prazan link i prazna opcija/SKU/bilješka na proizvodu dobivaju vrijednost iz prijedloga.
 * Već upisano na proizvodu ostaje. Veličine proizvoda se ne dodaju i ne brišu.
 */
export function mergeSupplierFromProposal(
  product: { supplierUrl?: string | null; variants?: Variant[] | null },
  proposal: { supplierUrl?: string | null; variants?: Variant[] | null },
) {
  const supplierUrl = filled(product.supplierUrl) ? String(product.supplierUrl) : filled(proposal.supplierUrl)
  const proposalVariants = proposal.variants ?? []
  const variants = (product.variants ?? []).map((variant) => {
    const hr = norm(variant.hr)
    const match = hr ? proposalVariants.find((item) => norm(item.hr) === hr) : undefined
    const cleaned = cleanVariant({
      ...variant,
      sup: filled(variant.sup) ? variant.sup : match?.sup,
      supplierSku: filled(variant.supplierSku) ? variant.supplierSku : match?.supplierSku,
      supplierNote: filled(variant.supplierNote) ? variant.supplierNote : match?.supplierNote,
    })
    return cleaned ?? { hr: variant.hr, en: variant.en || variant.hr }
  })
  return { supplierUrl, variants }
}

export function sameSupplierMapping(
  a: { supplierUrl?: string | null; variants?: Variant[] | null },
  b: { supplierUrl?: string | null; variants?: Variant[] | null },
) {
  if (filled(a.supplierUrl) !== filled(b.supplierUrl)) return false
  const left = a.variants ?? []
  const right = b.variants ?? []
  if (left.length !== right.length) return false
  return left.every((variant, i) => {
    const other = right[i]
    return variant.hr === other.hr
      && (variant.en || variant.hr) === (other.en || other.hr)
      && filled(variant.sup) === filled(other.sup)
      && filled(variant.supplierSku) === filled(other.supplierSku)
      && filled(variant.supplierNote) === filled(other.supplierNote)
      && (variant.stock ?? null) === (other.stock ?? null)
  })
}

const COLOUR =
  /^(?:mat|matte|brushed|polished|tamna|svijetla|light|dark)?\s*(crna|crni|crno|bijela|bijeli|bijelo|srebrna|srebrni|srebro|zlatna|zlatni|zlato|smeđa|smeđi|plava|plavi|zelena|zeleni|crvena|crveni|siva|sivi|bež|roza|pink|black|white|silver|gold|brown|blue|green|red|grey|gray|beige|ivory|navy|bronze|gunmetal|copper|noir)$/i

export function variantsAreColours(variants: Variant[]) {
  if (!variants.length) return false
  return variants.every((v) => {
    const hr = v.hr.trim()
    const en = (v.en || '').trim()
    if (/BIC/i.test(hr) || /BIC/i.test(en)) return false
    return COLOUR.test(hr) || COLOUR.test(en)
  })
}
