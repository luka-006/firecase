import { t } from './dict'
import { href, type Locale } from './routes'

/** Public shop links. Admin and staff menus do not use this. */
export function publicShopLinks(locale: Locale) {
  const d = t(locale)
  return [
    { href: href(locale, 'shop'), label: d.allCases },
    { href: href(locale, 'build'), label: d.buildSet },
    { href: href(locale, 'engraver'), label: d.engraver },
    { href: href(locale, 'contact'), label: d.contact },
  ]
}
