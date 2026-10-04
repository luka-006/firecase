import type { Locale } from './routes'

const fmt = {
  hr: new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }),
}

export const money = (cents: number, locale: Locale = 'hr') => fmt[locale].format(cents / 100)

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
