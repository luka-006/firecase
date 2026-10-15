export type FreightOption = {
  logisticName: string
  logisticPrice: number
  logisticAging: string
}

const SHIPPED = new Set(['SHIPPED', 'DELIVERED'])
/** 1 warehouse out, 2 forwarder received, 4–12 in transit through delivered. 0 none, 3 return started, 13 exception, 14 return. */
const TRACKING_SHIPPED = new Set([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])

export function supplierShipped(status: string) {
  const text = status.trim().toUpperCase()
  if (SHIPPED.has(text)) return true
  const code = Number(status)
  return Number.isFinite(code) && code >= 500 && code < 700
}

export function supplierTrackingShipped(status: number) {
  return TRACKING_SHIPPED.has(status)
}

export function agingMaxDays(aging: string | null | undefined): number | null {
  const nums = String(aging || '').match(/\d+/g)?.map((n) => Number(n)).filter((n) => Number.isFinite(n)) ?? []
  if (!nums.length) return null
  return Math.max(...nums)
}

/** Cheapest option whose upper transit days fit the cap. A named option wins when it is in the list. */
export function pickLogistic(
  options: FreightOption[],
  opts: { mode: 'auto' | 'name'; name: string; maxDays: number },
): FreightOption | null {
  const priced = options.filter((o) => o.logisticName.trim() && Number.isFinite(o.logisticPrice))
  if (!priced.length) return null
  const wanted = opts.name.trim().toLowerCase()
  if (opts.mode === 'name' && wanted) {
    const hit = priced.find((o) => o.logisticName.trim().toLowerCase() === wanted)
    if (hit) return hit
  }
  const cap = opts.maxDays > 0 ? opts.maxDays : 20
  const within = priced.filter((o) => {
    const max = agingMaxDays(o.logisticAging)
    return max !== null && max <= cap
  })
  const pool = within.length ? within : priced
  return [...pool].sort((a, b) => {
    if (a.logisticPrice !== b.logisticPrice) return a.logisticPrice - b.logisticPrice
    return (agingMaxDays(a.logisticAging) ?? 999) - (agingMaxDays(b.logisticAging) ?? 999)
  })[0] ?? null
}
