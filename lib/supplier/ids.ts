/** Shop order number sent to the supplier. Stable, so a repeated create can be looked up. */
export function supplierOrderNumber(orderId: number) {
  return `FC-${orderId}`
}

export function shopOrderIdFromNumber(orderNumber: string | null | undefined): number | null {
  const m = /^FC-(\d+)$/.exec(String(orderNumber || '').trim())
  if (!m) return null
  const id = Number(m[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function supplierId(raw: string | null | undefined): string {
  return String(raw || '').trim().replace(/[^A-Za-z0-9{}_-]/g, '').slice(0, 80)
}

export function safeSupplierMessage(message: string | null | undefined): string {
  return String(message || 'Greška dobavljača')
    .replace(/CJ\d+@api@[A-Za-z0-9_-]+/gi, '***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}
