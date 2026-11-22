import { t } from './dict'
import { href, type Locale } from './routes'
import { BUILD_SET_TIERS } from './set-builder'

export type ShopLink = { href: string; label: string; /** Shown as a highlighted chip in the header ("Napravi svoj set"). */ highlight?: string }

/** Public shop links. Admin and staff menus do not use this. */
export function publicShopLinks(locale: Locale): ShopLink[] {
  const d = t(locale)
  const top = Math.max(0, ...BUILD_SET_TIERS.map((tier) => tier.percent))
  return [
    { href: href(locale, 'shop'), label: d.allCases },
    { href: href(locale, 'build'), label: d.buildSet, highlight: `−${top}%` },
    { href: href(locale, 'engraver'), label: d.engraver },
    { href: href(locale, 'contact'), label: d.contact },
  ]
}
