export type DiscountLine = { labelHr: string; labelEn: string; unitCents: number }

/** One line per discount. `unitCents` is what the invoice prints (negative on a sale). */
export function invoiceDiscountLines(d: {
  discountCents?: number
  upsellDiscountCents?: number
  promoDiscountCents?: number
  promoCode?: string | null
}): DiscountLine[] {
  const upsell = d.upsellDiscountCents || 0
  const promo = d.promoDiscountCents || 0
  const lines: DiscountLine[] = []
  if (upsell !== 0) lines.push({ labelHr: 'Popust 10%', labelEn: 'Discount 10%', unitCents: -upsell })
  if (promo !== 0) {
    const code = (d.promoCode || '').trim()
    lines.push({
      labelHr: code ? `Popust 5% (${code})` : 'Popust 5%',
      labelEn: code ? `Discount 5% (${code})` : 'Discount 5%',
      unitCents: -promo,
    })
  }
  if (!lines.length && (d.discountCents || 0) !== 0) {
    lines.push({ labelHr: 'Popust 10%', labelEn: 'Discount 10%', unitCents: -(d.discountCents || 0) })
  }
  return lines
}
