const COUNTRY: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CY: 'Cyprus', CZ: 'Czech Republic', DE: 'Germany',
  DK: 'Denmark', EE: 'Estonia', ES: 'Spain', FI: 'Finland', FR: 'France', GR: 'Greece', HR: 'Croatia',
  HU: 'Hungary', IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MT: 'Malta',
  NL: 'Netherlands', PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia',
}

const HR_COUNTY: Record<string, string> = {
  '10': 'Zagreb', '20': 'Dubrovnik', '21': 'Split', '22': 'Sibenik', '23': 'Zadar', '31': 'Osijek',
  '32': 'Vukovar', '33': 'Virovitica', '34': 'Pozega', '35': 'Slavonski Brod', '40': 'Cakovec',
  '42': 'Varazdin', '43': 'Bjelovar', '44': 'Sisak', '47': 'Karlovac', '48': 'Koprivnica',
  '49': 'Krapina', '51': 'Rijeka', '52': 'Pula', '53': 'Gospic',
}

export function supplierDestination(order: { country: string; city: string; postal: string }) {
  const countryCode = (order.country || 'HR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'HR'
  const country = COUNTRY[countryCode] || countryCode
  const city = order.city.trim().slice(0, 50)
  const province = (countryCode === 'HR' ? HR_COUNTY[order.postal.slice(0, 2)] : '') || city || country
  return {
    countryCode,
    country: country.slice(0, 50),
    province: province.slice(0, 50),
    city: city || province.slice(0, 50),
  }
}

export function supplierPhone(phone: string) {
  const compact = phone.replace(/[^\d+]/g, '')
  const body = compact.startsWith('+') ? `+${compact.slice(1).replace(/\+/g, '')}` : compact.replace(/\+/g, '')
  return body.slice(0, 20)
}
