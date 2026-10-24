import type { OrderItem, Product, Variant } from './types'

export const SUPPLIER_NOTE =
  'Dropshipping order. Please do not include any invoice, price, receipt, or seller advertising in the parcel. Thank you.'

const CALLING: Record<string, string> = {
  AT: '43', BE: '32', BG: '359', CY: '357', CZ: '420', DE: '49', DK: '45', EE: '372', ES: '34',
  FI: '358', FR: '33', GR: '30', HR: '385', HU: '36', IE: '353', IT: '39', LT: '370', LU: '352',
  LV: '371', MT: '356', NL: '31', PL: '48', PT: '351', RO: '40', SE: '46', SI: '386', SK: '421',
}

const COUNTRY_HR: Record<string, string> = {
  AT: 'Austrija', BE: 'Belgija', BG: 'Bugarska', CY: 'Cipar', CZ: 'Češka', DE: 'Njemačka', DK: 'Danska',
  EE: 'Estonija', ES: 'Španjolska', FI: 'Finska', FR: 'Francuska', GR: 'Grčka', HR: 'Hrvatska', HU: 'Mađarska',
  IE: 'Irska', IT: 'Italija', LT: 'Litva', LU: 'Luksemburg', LV: 'Latvija', MT: 'Malta', NL: 'Nizozemska',
  PL: 'Poljska', PT: 'Portugal', RO: 'Rumunjska', SE: 'Švedska', SI: 'Slovenija', SK: 'Slovačka',
}

const COUNTY: Record<string, string> = {
  '10': 'Grad Zagreb / Zagrebačka',
  '20': 'Dubrovačko-neretvanska',
  '21': 'Splitsko-dalmatinska',
  '22': 'Šibensko-kninska',
  '23': 'Zadarska',
  '31': 'Osječko-baranjska',
  '32': 'Vukovarsko-srijemska',
  '33': 'Virovitičko-podravska',
  '34': 'Požeško-slavonska',
  '35': 'Brodsko-posavska',
  '40': 'Međimurska',
  '42': 'Varaždinska',
  '43': 'Bjelovarsko-bilogorska',
  '44': 'Sisačko-moslavačka',
  '47': 'Karlovačka',
  '48': 'Koprivničko-križevačka',
  '49': 'Krapinsko-zagorska',
  '51': 'Primorsko-goranska',
  '52': 'Istarska',
  '53': 'Ličko-senjska',
}

const STAGE_LABEL: Record<string, string> = {
  pending: 'Nedovršena',
  todo: 'Čeka narudžbu kod dobavljača',
  ordered: 'Naručeno kod dobavljača',
  shipped: 'Poslano',
  delivered: 'Dostavljeno',
  cancelled: 'Otkazano',
  refunded: 'Vraćen novac',
  ok: 'Izdano (Solo)',
  off: 'Isključeno',
  error: 'Greška',
}

export function orderStage(o: { status: string; supplierOrder?: string | null }) {
  if (o.status !== 'paid') return o.status
  return o.supplierOrder?.trim() ? 'ordered' : 'todo'
}

export function stageLabel(s: string, fiscal?: boolean) {
  if (fiscal && s === 'pending') return 'Čeka Solo'
  return STAGE_LABEL[s] ?? s
}

export function formatSupplierPhone(phone: string, country: string) {
  const raw = phone.trim().replace(/[^\d+]/g, '')
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('00')) return `+${raw.slice(2)}`
  const cc = CALLING[(country || 'HR').toUpperCase()] || ''
  if (cc && raw.startsWith(cc)) return `+${raw}`
  if (!cc) return raw
  const national = raw.startsWith('0') ? raw.slice(1) : raw
  return `+${cc}${national}`
}

export function countryNameHr(code: string) {
  const key = (code || 'HR').toUpperCase()
  return COUNTRY_HR[key] || key
}

export function hrCounty(postal: string) {
  return COUNTY[postal.trim().slice(0, 2)] ?? ''
}

export type AddressField = { key: string; label: string; value: string }

export function supplierAddressFields(o: {
  name: string
  phone: string
  address: string
  postal: string
  city: string
  country: string
}): AddressField[] {
  const country = (o.country || 'HR').toUpperCase()
  const fields: AddressField[] = [
    { key: 'name', label: 'Ime i prezime', value: o.name.trim() },
    { key: 'phone', label: 'Telefon', value: formatSupplierPhone(o.phone, country) },
    { key: 'street', label: 'Ulica i broj', value: o.address.trim() },
    { key: 'postal', label: 'Poštanski broj', value: o.postal.trim() },
    { key: 'city', label: 'Grad', value: o.city.trim() },
  ]
  if (country === 'HR') {
    const region = hrCounty(o.postal)
    if (region) fields.push({ key: 'region', label: 'Županija', value: region })
  }
  fields.push({ key: 'country', label: 'Država', value: countryNameHr(country) })
  return fields
}

export function supplierAddressBlock(fields: AddressField[]) {
  return fields.map((field) => field.value).filter(Boolean).join('\n')
}

export function matchVariant(
  product: { variants?: Variant[] | null } | null | undefined,
  item: { variant?: string; variantIndex?: number },
) {
  const variants = product?.variants ?? []
  if (typeof item.variantIndex === 'number' && item.variantIndex >= 0) {
    const byIndex = variants[item.variantIndex]
    if (byIndex && (!item.variant || byIndex.hr === item.variant || byIndex.en === item.variant)) return byIndex
  }
  if (!item.variant) return undefined
  return variants.find((variant) => variant.hr === item.variant || variant.en === item.variant)
}

export type SupplierLine = {
  name: string
  variant: string
  qty: number
  url: string
  option: string
  sku: string
  note: string
  productId: number
  missingUrl: boolean
  missingOption: boolean
}

export function resolveSupplierLine(item: OrderItem, product?: Pick<Product, 'supplierUrl' | 'variants'> | null): SupplierLine {
  const variant = matchVariant(product, item)
  const url = (item.supplierUrl || product?.supplierUrl || '').trim()
  const option = (item.supplierOption || variant?.sup || '').trim()
  const sku = (item.supplierSku || variant?.supplierSku || '').trim()
  const note = (item.supplierNote || variant?.supplierNote || '').trim()
  const needsOption = Boolean(item.variant?.trim()) || Boolean(product?.variants?.length)
  return {
    name: item.name,
    variant: item.variant || '',
    qty: item.qty,
    url,
    option,
    sku,
    note,
    productId: item.productId,
    missingUrl: !url,
    missingOption: needsOption && !option,
  }
}
