/**
 * Engraving fonts the customer can pick. The id is the number on the
 * supplier's font sheet and goes on the supplier order, so keep ids stable.
 * Each one is the closest free font to the supplier's; 6 and 7 have heart
 * and crown capitals on the sheet that the preview does not draw.
 */
export const ENGRAVE_FONTS = [
  { id: 1, name: 'Courgette' },
  { id: 2, name: 'UnifrakturMaguntia' },
  { id: 3, name: 'Arimo Bold' },
  { id: 4, name: 'Charm Bold' },
  { id: 5, name: 'Charm' },
  { id: 6, name: 'Playfair Display Italic' },
  { id: 7, name: 'Cormorant Garamond Italic' },
  { id: 8, name: 'Herr Von Muellerhoff' },
  { id: 9, name: 'Playball' },
  { id: 10, name: 'Dancing Script' },
  { id: 11, name: 'Allura' },
  { id: 12, name: 'Sacramento' },
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
