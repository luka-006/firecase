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

export function switchLocale(pathname: string, to: Locale): string {
  const parts = pathname.split('/').filter(Boolean)
  let from: Locale = 'hr'
  if (parts[0] === 'en') {
    from = 'en'
    parts.shift()
  }
  const route = Object.values(ROUTES).find((r) => parts[0] && r[from] === parts[0])
  const seg = route ? route[to] : (parts[0] ?? '')
  const path = [seg, ...parts.slice(1)].filter(Boolean).join('/')
  return (to === 'en' ? '/en' : '') + (path ? '/' + path : '') || '/'
}
