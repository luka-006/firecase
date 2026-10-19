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

function fitsLine(variants: Variant[], locale: Locale) {
  const labels: string[] = []
  for (const v of variants) {
    const m = `${v.hr || ''} ${v.en || ''}`.match(/BIC\s*J\s*(\d+)/i)
    if (!m) continue
    const label = `BIC J${m[1]}`
    if (!labels.includes(label)) labels.push(label)
  }
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
}) {
  const en = input.locale === 'en'
  const delivery = tidy(input.delivery || (en ? '8–16 days' : '8–16 dana'))
  const tail = en ? `Delivery in ${delivery}.` : `Dostava ${delivery}.`
  const name = tidy(input.name) || 'Firecase'
  const lead = `${name}, ${en ? 'lighter case' : 'futrola za upaljač'}.`
  const extras = [
    sentence(input.short),
    input.material ? (en ? `Material: ${sentence(input.material)}` : `Materijal: ${sentence(input.material)}`) : '',
    fitsLine(input.variants, input.locale),
  ].filter(Boolean)
  const pads = en
    ? ['It slides onto your lighter in a few seconds.', 'It keeps the lighter free of scratches.', 'Ships across Croatia.']
    : ['Navučete je na upaljač za par sekundi.', 'Čuva upaljač od ogrebotina.', 'Šaljemo je po cijeloj Hrvatskoj.']

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
