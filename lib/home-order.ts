// Order of the homepage collection and the "Sniženo" strip.
// Pure functions only: the homepage (server) and the Promiješaj button (client) both use them.

/** Small seeded PRNG (mulberry32). The same seed always gives the same sequence. */
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle into a new array. `random` defaults to Math.random. */
export function shuffle<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Seed that changes once an hour, so the homepage order rotates but stays stable between cache refreshes. */
export function hourSeed(now = Date.now()) {
  return Math.floor(now / 3_600_000)
}

/** Interleave cases and sets (case, set, case, set ...) the way the homepage always has. */
export function interleaveSets<T extends { set?: boolean }>(list: readonly T[], limit = Infinity): T[] {
  const cases = list.filter((x) => !x.set)
  const sets = list.filter((x) => x.set)
  const out: T[] = []
  let c = 0
  let s = 0
  while (out.length < limit && (c < cases.length || s < sets.length)) {
    if (c < cases.length) out.push(cases[c++])
    if (out.length < limit && s < sets.length) out.push(sets[s++])
  }
  return out
}

type Priced = { priceCents: number; compareCents: number | null }

/** A product is on sale when the shop shows a higher, crossed-out price next to its price. */
export function isOnSale(p: Priced) {
  return p.compareCents != null && p.compareCents > p.priceCents
}

/**
 * Percentage to show on a sale badge, or null when no badge number may be shown.
 * Omnibus: a price reduction is measured against the lowest price of the last 30 days,
 * not against the crossed-out price, so the number comes from lowest30 only.
 */
export function salePercent(priceCents: number, lowest30: number | null | undefined) {
  if (lowest30 == null || lowest30 <= priceCents) return null
  const pct = Math.floor(((lowest30 - priceCents) / lowest30) * 100)
  return pct >= 1 ? pct : null
}
