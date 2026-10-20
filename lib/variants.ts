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
