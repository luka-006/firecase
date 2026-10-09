export const LOCALES = ['hr', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v)

// internal = putanja pod app/[locale]/..., hr/en = javni URL segment
export const ROUTES = {
  home: { internal: '', hr: '', en: '' },
  shop: { internal: 'shop', hr: 'trgovina', en: 'shop' },
  product: { internal: 'product', hr: 'proizvod', en: 'product' },
  cart: { internal: 'cart', hr: 'kosarica', en: 'cart' },
  checkout: { internal: 'checkout', hr: 'blagajna', en: 'checkout' },
  order: { internal: 'order', hr: 'narudzba', en: 'order' },
  account: { internal: 'account', hr: 'moj-racun', en: 'account' },
  login: { internal: 'login', hr: 'prijava', en: 'login' },
  register: { internal: 'register', hr: 'registracija', en: 'register' },
  favorites: { internal: 'favorites', hr: 'favoriti', en: 'favorites' },
  forgot: { internal: 'forgot-password', hr: 'zaboravljena-lozinka', en: 'forgot-password' },
  reset: { internal: 'reset-password', hr: 'nova-lozinka', en: 'reset-password' },
  terms: { internal: 'legal/terms', hr: 'uvjeti-poslovanja', en: 'terms' },
  privacy: { internal: 'legal/privacy', hr: 'privatnost', en: 'privacy' },
  cookies: { internal: 'legal/cookies', hr: 'kolacici', en: 'cookies' },
  shipping: { internal: 'legal/shipping', hr: 'dostava', en: 'shipping' },
  returns: { internal: 'legal/returns', hr: 'povrat-i-reklamacije', en: 'returns' },
  withdrawal: { internal: 'legal/withdrawal', hr: 'obrazac-za-odustanak', en: 'withdrawal-form' },
  contact: { internal: 'legal/contact', hr: 'kontakt', en: 'contact' },
} as const
export type RouteKey = keyof typeof ROUTES

/** Javni URL segment samo na engleskom (npr. /shop), ne na hrvatskom (/trgovina). */
export function isEnPublicSegment(segment: string) {
  return Object.values(ROUTES).some((r) => r.en === segment && r.en !== r.hr)
}

export function href(locale: Locale, key: RouteKey, param?: string, query?: string) {
  const seg = ROUTES[key][locale]
  const p =
    (locale === 'en' ? '/en' : '') + (seg ? '/' + seg : '') + (param ? '/' + encodeURIComponent(param) : '')
  return (p || '/') + (query ? '?' + query : '')
}

// Javni URL -> interna putanja (koristi proxy.ts)
export function toInternal(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  let locale: Locale = 'hr'
  if (parts[0] === 'en') {
    locale = 'en'
    parts.shift()
  }
  if (parts.length === 0) return `/${locale}`
  const route = Object.values(ROUTES).find((r) => r[locale] !== '' && r[locale] === parts[0])
  if (!route) return `/${locale}/${parts.join('/')}`
  return `/${locale}/${route.internal}${parts.length > 1 ? '/' + parts.slice(1).join('/') : ''}`
}

// Interna putanja (/hr/shop, /en/legal/terms) -> javni URL za zadani locale
export function hrefFromInternal(internalPath: string, locale: Locale): string {
  const parts = internalPath.split('/').filter(Boolean)
  if (parts[0] === 'hr' || parts[0] === 'en') parts.shift()
  if (parts.length === 0) return href(locale, 'home')
  if (parts[0] === 'legal' && parts[1]) {
    const entry = Object.entries(ROUTES).find(([, r]) => r.internal === `legal/${parts[1]}`)
    if (entry) return href(locale, entry[0] as RouteKey)
  }
  if (parts[0] === 'product' && parts[1]) return href(locale, 'product', decodeURIComponent(parts[1]))
  const entry = Object.entries(ROUTES).find(([, r]) => r.internal === parts[0])
  if (entry) return href(locale, entry[0] as RouteKey)
  const tail = parts.map((p) => encodeURIComponent(p)).join('/')
  return (locale === 'en' ? '/en' : '') + (tail ? '/' + tail : '') || '/'
}

// Radi i s javnim (/trgovina, /en/shop) i s internim URL-om koji Next ponekad vrati u usePathname()
export function switchLocale(pathname: string, to: Locale): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return hrefFromInternal(toInternal(normalized), to)
}
