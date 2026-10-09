import type { Locale } from './routes'

// sup = opcija koju treba odabrati kod dobavljača (npr. boja/veličina na AliExpressu)
export type Variant = { hr: string; en: string; sup?: string }

export type ProposalStatus = 'draft' | 'review' | 'rejected' | 'accepted'

export const QUALITY_TAGS = ['Premium', 'Metal', 'Leather', 'Quality', 'Heavy', 'Luxury'] as const
export type QualityTag = (typeof QUALITY_TAGS)[number]

export type ProductProposal = {
  id: number
  status: ProposalStatus
  nameHr: string
  nameEn: string
  shortHr: string
  shortEn: string
  descHr: string
  descEn: string
  images: string[]
  variants: Variant[]
  supplierUrl: string
  costCents: number | null
  estDeliveryHr: string
  estDeliveryEn: string
  weightDims: string
  materialHr: string
  materialEn: string
  manufacturer: string
  euResponsible: string
  safetyHr: string
  safetyEn: string
  qualityTags: QualityTag[]
  notes: string
  sources: string
  rejectReason: string | null
  productId: number | null
  createdAt: Date
  updatedAt: Date
}

export type Product = {
  id: number
  slug: string
  nameHr: string
  nameEn: string
  shortHr: string
  shortEn: string
  descHr: string
  descEn: string
  priceCents: number
  compareCents: number | null
  images: string[]
  variants: Variant[]
  fits: string
  stock: number | null
  active: boolean
  featured: boolean
  sort: number
  sku: string
  materialHr: string
  materialEn: string
  manufacturer: string
  euResponsible: string
  safetyHr: string
  safetyEn: string
  supplierUrl: string
  costCents: number | null
  proposalId?: number | null
  lowest30?: number | null
}

type LocalizedField = 'name' | 'short' | 'desc' | 'material' | 'safety'
export function loc(p: Product, field: LocalizedField, locale: Locale): string {
  const en = p[`${field}En` as keyof Product] as string
  const hr = p[`${field}Hr` as keyof Product] as string
  return locale === 'en' && en ? en : hr
}

export type OrderItem = {
  productId: number
  slug: string
  name: string
  variant: string
  qty: number
  unitCents: number
  image?: string
  supplierUrl?: string
  supplierOption?: string
  costCents?: number | null
}

export type Order = {
  id: number
  publicId: string
  userId: number | null
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  email: string
  name: string
  phone: string
  address: string
  city: string
  postal: string
  country: string
  note: string
  items: OrderItem[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  locale: Locale
  stripeSessionId: string | null
  stripePaymentIntent: string | null
  paymentMethod: string | null
  tracking: string
  carrier: string
  trackingUrl: string
  confirmationEmailSentAt: Date | null
  confirmationEmailError: string | null
  shippedEmailSentAt: Date | null
  shippedEmailError: string | null
  supplierOrder: string
  paidAt: Date | null
  shippedAt: Date | null
  createdAt: Date
}

export type InvoiceData = {
  seller: { legalName: string; address: string; postal: string; city: string; oib: string; email: string }
  buyer: { name: string; email: string; address: string; postal: string; city: string; country: string }
  items: { name: string; variant?: string; qty: number; unitCents: number; totalCents: number }[]
  shippingCents: number
  totalCents: number
  paymentLabel: string
  orderPublicId: string
  orderId: number
  operatorOib: string
  premises: string
  device: string
  seqMode: 'P' | 'N'
  locale: Locale
  stornoOfNumber?: string
}

export type Invoice = {
  id: number
  orderId: number
  year: number
  seq: number
  number: string
  issuedAt: Date
  totalCents: number
  paymentCode: string
  stornoOf: number | null
  zki: string | null
  jir: string | null
  fiscalStatus: 'off' | 'ok' | 'pending' | 'error'
  fiscalError: string | null
  fiscalAttempts: number
  data: InvoiceData
}
