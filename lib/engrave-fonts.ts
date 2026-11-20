/**
 * Engraving fonts the customer can pick. The id is the number written on the
 * supplier order, so keep ids stable and change only the order of display.
 * Provisional set until the supplier's font sheet is matched.
 */
export const ENGRAVE_FONTS = [
  { id: 1, name: 'Great Vibes' },
  { id: 2, name: 'Dancing Script' },
  { id: 3, name: 'Pacifico' },
  { id: 4, name: 'Allura' },
  { id: 5, name: 'Satisfy' },
  { id: 6, name: 'Lobster' },
  { id: 7, name: 'Playfair Display' },
  { id: 8, name: 'Cinzel' },
  { id: 9, name: 'Abril Fatface' },
  { id: 10, name: 'Bebas Neue' },
  { id: 11, name: 'Montserrat' },
  { id: 12, name: 'Courier Prime' },
] as const

export type EngraveFontId = (typeof ENGRAVE_FONTS)[number]['id']

export const DEFAULT_ENGRAVE_FONT: EngraveFontId = 1

export function engraveFont(id: unknown) {
  return ENGRAVE_FONTS.find((f) => f.id === id)
}

/** "Font 3 (Pacifico)" for orders, admin and email. Empty when there is no valid font. */
export function engraveFontLabel(id: unknown) {
  const f = engraveFont(id)
  return f ? `Font ${f.id} (${f.name})` : ''
}

/** Preview metal for a colour option. Anything not silver shows gold. */
export function engraveMetal(variant?: { hr?: string; en?: string } | null): 'gold' | 'silver' {
  const name = `${variant?.hr ?? ''} ${variant?.en ?? ''}`.toLowerCase()
  return /srebr|silver|chrom|krom/.test(name) ? 'silver' : 'gold'
}
