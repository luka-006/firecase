import type { Locale } from './routes'
import type { Variant } from './types'

const MIN = 140
const MAX = 160

function tidy(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function sentence(s: string) {
  const t = tidy(s).replace(/[.!?]+$/g, '')
  return t ? `${t}.` : ''
}

/** Open Graph fields every page shares. Pages that set their own openGraph must spread this. */
export function baseOpenGraph(locale: Locale) {
  const en = locale === 'en'
  return {
    type: 'website' as const,
    siteName: 'Firecase',
    locale: en ? 'en_US' : 'hr_HR',
    alternateLocale: en ? 'hr_HR' : 'en_US',
  }
}

/** Default site description, also used on the homepage. */
export function siteDescription(locale: Locale, freeFrom: string) {
  return locale === 'en'
    ? `Metal and leather cases for BIC, Clipper, Cricket and Zippo lighters. Delivery across Croatia, free from ${freeFrom}, and 14 days to return.`
    : `Metalne i kožne futrole za upaljače BIC, Clipper, Cricket i Zippo. Dostava po cijeloj Hrvatskoj, besplatna od ${freeFrom}, i 14 dana za povrat.`
}

/** Titles and meta descriptions for the listing pages (shop, sets, engraver). */
export function listingMeta(page: 'shop' | 'sets' | 'engraver' | 'build', locale: Locale) {
  const en = locale === 'en'
  if (page === 'build') {
    return en
      ? { title: 'Build your own set of lighter cases', description: 'Pick the lighter cases you like and put them in one set. 3 cases get 10% off, 5 or more ship free, 8 or more get 30%. For BIC, Clipper, Cricket and Zippo.' }
      : { title: 'Napravite svoj set futrola za upaljače', description: 'Odaberite futrole za upaljače i složite svoj set. Za 3 futrole 10% popusta, za 5 i više besplatna dostava, za 8 i više 30%. Za BIC, Clipper, Cricket i Zippo.' }
  }
  if (page === 'shop') {
    return en
      ? { title: 'Lighter cases – Collection', description: 'Metal and leather lighter cases for BIC J5, BIC J6, Clipper, Cricket and Zippo. Buy one on its own or build a set and save. Delivery across Croatia.' }
      : { title: 'Futrole za upaljače – Kolekcija', description: 'Metalne i kožne futrole za upaljače BIC J5, BIC J6, Clipper, Cricket i Zippo. Uzmite jednu ili složite set i uštedite. Dostava po cijeloj Hrvatskoj.' }
  }
  if (page === 'sets') {
    return en
      ? { title: 'Lighter case sets', description: 'Sets of lighter cases that cost less than buying each case on its own. Ready made or built by you, for BIC J5, BIC J6, Clipper and Cricket.' }
      : { title: 'Setovi futrola za upaljače', description: 'Setovi futrola za upaljače, povoljniji nego kad futrole kupujete pojedinačno. Gotovi ili po vašem izboru, za BIC J5, BIC J6, Clipper i Cricket.' }
  }
  return en
    ? { title: 'Engraved lighter cases', description: 'Lighter cases engraved with a name or initials. A personal gift for him. Engraving supports the letters A to Z, without accents.' }
    : { title: 'Futrole za upaljače s gravurom imena', description: 'Futrole za upaljače s ugraviranim imenom ili inicijalima. Osoban poklon za njega. Gravura podržava slova A-Z, bez kvačica.' }
}

/** Public profiles for Organization.sameAs (helps Google tie the brand to its socials). */
export const SOCIAL_PROFILES = ['https://www.instagram.com/firecase2026/', 'https://www.tiktok.com/@firecase1']

const MODEL_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/BIC\s*J\s*(\d+)/gi, (m) => `BIC J${m[1]}`],
  [/\bClipper\b/gi, () => 'Clipper'],
  [/\bCricket\b/gi, () => 'Cricket'],
  [/\bZippo\b/gi, () => 'Zippo'],
]

/** Lighter models a product fits, in the order they first appear in the given texts. */
export function lighterModels(texts: string[]): string[] {
  const found: { label: string; at: number }[] = []
  const all = texts.filter(Boolean).join(' \n ')
  for (const [re, label] of MODEL_PATTERNS) {
    for (const m of all.matchAll(re)) {
      const l = label(m)
      if (!found.some((f) => f.label === l)) found.push({ label: l, at: m.index ?? 0 })
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.label)
}

/** Product page title: "Engraver – futrola za upaljač BIC J6". Falls back to the generic phrase. */
export function productSeoTitle(name: string, models: string[], locale: Locale) {
  const en = locale === 'en'
  const fit = models.slice(0, 2).join(' / ')
  if (en) return fit ? `${name} – lighter case for ${fit}` : `${name} – lighter case`
  return fit ? `${name} – futrola za upaljač ${fit}` : `${name} – futrola za upaljač`
}

function fitsLine(variants: Variant[], locale: Locale, fits = '') {
  const labels = lighterModels([...variants.map((v) => `${v.hr || ''} ${v.en || ''}`), fits])
  if (!labels.length) return ''
  if (locale === 'en') return labels.length === 1 ? `Fits ${labels[0]}.` : `Fits ${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}.`
  return labels.length === 1 ? `Za ${labels[0]}.` : `Za ${labels.slice(0, -1).join(', ')} i ${labels.at(-1)}.`
}

function clampMeta(text: string) {
  let clean = tidy(text)
  if (clean.length <= MAX && clean.length >= MIN) return clean
  if (clean.length < MIN) return clean
  let cut = clean.slice(0, MAX)
  const space = cut.lastIndexOf(' ')
  if (space >= MIN) cut = cut.slice(0, space)
  cut = cut.replace(/[\s,;:–-]+$/u, '').trim()
  if (!/[.!?]$/.test(cut)) cut = `${cut.slice(0, MAX - 1).replace(/[\s,;:–-]+$/u, '').trim()}.`
  if (cut.length > MAX) cut = `${cut.slice(0, MAX - 1).replace(/[\s,;:–-]+$/u, '').trim()}.`
  return cut
}

export function productMetaDescription(input: {
  locale: Locale
  name: string
  short: string
  material: string
  variants: Variant[]
  delivery?: string
  fits?: string
}) {
  const en = input.locale === 'en'
  // The delivery time stays out of search snippets; it is shown in checkout, the terms and the emails.
  const tail = ''
  const name = tidy(input.name) || 'Firecase'
  const lead = `${name}, ${en ? 'lighter case' : 'futrola za upaljač'}.`
  // Order matters: when the text is too long, extras are dropped from the end, so the fit
  // line (what people search for) is kept before the material line.
  const extras = [
    sentence(input.short),
    fitsLine(input.variants, input.locale, input.fits),
    input.material ? (en ? `Material: ${sentence(input.material)}` : `Materijal: ${sentence(input.material)}`) : '',
  ].filter(Boolean)
  const pads = en
    ? ['It slides onto your lighter in a few seconds.', 'It keeps the lighter free of scratches.', 'Ships across Croatia.', 'Returns within 14 days.']
    : ['Navučete je na upaljač za par sekundi.', 'Čuva upaljač od ogrebotina.', 'Šaljemo je po cijeloj Hrvatskoj.', 'Povrat u roku od 14 dana.']

  const join = (bits: string[]) => tidy(bits.filter(Boolean).join(' '))
  let chosen = extras
  let text = join([lead, ...chosen, tail])
  while (text.length > MAX && chosen.length) {
    chosen = chosen.slice(0, -1)
    text = join([lead, ...chosen, tail])
  }
  const added: string[] = []
  while (text.length < MIN) {
    const pad = pads.find((p) => !added.includes(p))
    if (!pad) break
    const next = join([lead, ...chosen, ...added, pad, tail])
    if (next.length > MAX) {
      text = text.length >= MIN ? text : clampMeta(next)
      break
    }
    added.push(pad)
    text = next
  }
  return clampMeta(text)
}

export function contactMetaDescription(locale: Locale) {
  return locale === 'en'
    ? 'A question about your order, a product or delivery? Please write to us at info@firecase.net. We will reply within 24 hours on business days.'
    : 'Imate pitanje o narudžbi, proizvodu ili dostavi? Pišite nam na info@firecase.net. Na poruke odgovaramo u roku od 24 sata, svakim radnim danom.'
}
