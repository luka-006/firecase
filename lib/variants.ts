import type { Variant } from './types'

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
