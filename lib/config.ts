export const SELLER = {
  brand: 'Firecase',
  legalName: 'KASALO DIGITAL, obrt za web dizajn i razvoj aplikacija, vl. Luka Kasalo',
  shortName: 'Kasalo Digital',
  owner: 'Luka Kasalo',
  address: 'Tvrtkova 1',
  postal: '22300',
  city: 'Knin',
  country: 'Hrvatska',
  countryEn: 'Croatia',
  oib: '05372595966',
  email: 'info@firecase.net',
  /** Predugovorne obavijesti u Uvjetima. Nije na Kontakt stranici, u mailovima ni u podnožju. */
  phone: '+385 92 364 1016',
  registry: 'Obrtni registar',
  // Matični broj obrta (MBO) - upiši kad ga imaš, prikazuje se samo ako nije prazan
  registryNumber: '',
  /** Adresa za povrat robe, samo na stranici Kontakt. */
  returnAddress: 'KASALO DIGITAL, vl. Luka Kasalo, Tvrtkova 1, 22300 Knin',
  vatNoteHr: 'Obveznik nije u sustavu PDV-a. PDV nije obračunat temeljem čl. 90. st. 1. Zakona o PDV-u.',
  vatNoteEn: 'The seller is not registered for VAT. VAT not charged pursuant to Art. 90(1) of the Croatian VAT Act.',
}

// Produkcija: https://firecase.net (NEXT_PUBLIC_SITE_URL u Vercelu)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

/** Na izvodu kartice (Stripe, max. 22 znaka). */
export const STRIPE_STATEMENT_DESCRIPTOR = 'FIRECASE'

export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]
