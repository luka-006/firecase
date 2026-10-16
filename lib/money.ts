import type { Locale } from './routes'

const fmt = {
  hr: new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }),
}

export const money = (cents: number, locale: Locale = 'hr') => fmt[locale].format(cents / 100)

const whole = {
  hr: new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
}

/** Round euro amounts, for thresholds such as 40 €. */
export function euros(cents: number, locale: Locale = 'hr') {
  if (cents % 100 === 0) return whole[locale].format(cents / 100)
  return money(cents, locale)
}

// "12.34" format za fiskalizaciju
export const amountDot = (cents: number) => (cents / 100).toFixed(2)

export function zagrebParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zagreb',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find((p) => p.type === t)!.value
  return { year: g('year'), month: g('month'), day: g('day'), hour: g('hour') === '24' ? '00' : g('hour'), minute: g('minute'), second: g('second') }
}

export function formatDateTime(d: Date | string, locale: Locale = 'hr') {
  return new Intl.DateTimeFormat(locale === 'hr' ? 'hr-HR' : 'en-GB', {
    timeZone: 'Europe/Zagreb', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(d))
}
