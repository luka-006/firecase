// "Napravi svoj set": the customer picks cases and the set price drops with the count.
// Pure functions only: the builder page (client), the cart and checkout (server) all use them.

export const BUILD_SET_MIN = 2
export const BUILD_SET_MAX = 10

/** Discount by number of cases in a set the customer builds. The highest tier reached applies. */
export const BUILD_SET_TIERS: readonly { min: number; percent: number }[] = [
  { min: 3, percent: 10 },
  { min: 5, percent: 20 },
]

export type BuiltSetPart = { id: number; vi: number }

export function builtSetPercent(count: number) {
  let percent = 0
  for (const tier of BUILD_SET_TIERS) if (count >= tier.min) percent = Math.max(percent, tier.percent)
  return percent
}

/** Set price from the single-case prices, in cents. */
export function priceBuiltSet(partCents: number[]) {
  const count = partCents.length
  const fullCents = partCents.reduce((sum, cents) => sum + cents, 0)
  const percent = builtSetPercent(count)
  const totalCents = Math.round((fullCents * (100 - percent)) / 100)
  return { count, fullCents, percent, savedCents: fullCents - totalCents, totalCents }
}

/** How many more cases unlock the next tier, or null at the top tier. */
export function nextBuiltSetTier(count: number): { need: number; percent: number } | null {
  const next = [...BUILD_SET_TIERS].sort((a, b) => a.min - b.min).find((tier) => tier.min > count)
  return next ? { need: next.min - count, percent: next.percent } : null
}

export function builtSetSizeOk(count: number) {
  return count >= BUILD_SET_MIN && count <= BUILD_SET_MAX
}

/** Same cases in any order are the same set, so the cart merges them into one line. */
export function builtSetKey(parts: BuiltSetPart[]) {
  return 'set:' + parts.map((p) => `${p.id}.${p.vi}`).sort().join(',')
}

/** Cases that go into a built set: published single cases, not sets and not engraved ones. */
export function buildableCase(p: { kind?: string | null; engrave?: boolean | null; active?: boolean }) {
  return p.active !== false && p.kind !== 'set' && p.engrave !== true
}

/** Plain single cases are sold only inside a set. Sets and engraved cases still sell on their own. */
export function soldOnlyInSet(p: { kind?: string | null; engrave?: boolean | null }) {
  return p.kind !== 'set' && p.engrave !== true
}
