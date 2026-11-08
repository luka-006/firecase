/** URL slug from the Croatian display name. English names are never used. */
export function slugifyHr(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/đ/g, 'd')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Pick a free slug for one product. `taken` must not include slugs this product already owns.
 * A collision gets `-{id}` so product ids stay stable.
 */
export function chooseSlug(nameHr, selfId, taken) {
  const base = slugifyHr(nameHr)
  const desired = base || (selfId ? `proizvod-${selfId}` : '')
  if (!desired) return ''
  if (!taken.has(desired)) return desired
  if (selfId) {
    const suffixed = `${desired.slice(0, 68)}-${selfId}`.replace(/-+$/g, '').slice(0, 80)
    if (!taken.has(suffixed)) return suffixed
    const fallback = `proizvod-${selfId}`
    if (!taken.has(fallback)) return fallback
  }
  const stem = (base || 'proizvod').slice(0, 60)
  for (let n = 2; n < 100; n++) {
    const candidate = `${stem}-${selfId ? `${selfId}-${n}` : n}`.slice(0, 80)
    if (!taken.has(candidate)) return candidate
  }
  return ''
}

/**
 * Plan only. Does not rename display names. Second run on the result is empty.
 * @param {{ id: number, slug: string, nameHr: string }[]} products
 * @param {{ slug: string, productId: number }[]} aliases
 */
export function planSlugUpdates(products, aliases = []) {
  const taken = new Set()
  for (const product of products) if (product.slug) taken.add(product.slug)
  for (const alias of aliases) if (alias.slug) taken.add(alias.slug)
  const changes = []
  for (const product of [...products].sort((a, b) => a.id - b.id)) {
    const owned = new Set([
      product.slug,
      ...aliases.filter((alias) => alias.productId === product.id).map((alias) => alias.slug),
    ])
    const blocked = new Set([...taken].filter((slug) => !owned.has(slug)))
    const next = chooseSlug(product.nameHr, product.id, blocked)
    if (!next || next === product.slug) continue
    taken.add(next)
    changes.push({ id: product.id, nameHr: product.nameHr, from: product.slug, to: next })
  }
  return changes
}

export async function ensureSlugAliases(sql) {
  await sql`
    create table if not exists product_slug_aliases (
      slug text primary key,
      product_id int not null references products(id) on delete cascade,
      created_at timestamptz not null default now()
    )`
  await sql`create index if not exists product_slug_aliases_product on product_slug_aliases(product_id)`
}

/** Apply a plan. Old slugs stay as aliases. Names, prices, images and ids are not written. */
export async function applySlugPlan(sql, plan) {
  await ensureSlugAliases(sql)
  const applied = []
  for (const change of plan) {
    if (!change.from || change.from === change.to) continue
    const [productClash] = await sql`select id from products where slug = ${change.to} and id <> ${change.id} limit 1`
    const [aliasClash] = await sql`select product_id from product_slug_aliases where slug = ${change.to} and product_id <> ${change.id} limit 1`
    let to = change.to
    if (productClash || aliasClash) {
      to = `${change.to.slice(0, 68)}-${change.id}`.replace(/-+$/g, '').slice(0, 80)
      const [again] = await sql`select id from products where slug = ${to} and id <> ${change.id} limit 1`
      if (again || to === change.from) continue
    }
    await sql`delete from product_slug_aliases where slug = ${to} and product_id = ${change.id}`
    await sql`
      insert into product_slug_aliases (slug, product_id) values (${change.from}, ${change.id})
      on conflict (slug) do update set product_id = excluded.product_id
      where product_slug_aliases.product_id = ${change.id}`
    const [row] = await sql`
      update products set slug = ${to}, updated_at = now()
      where id = ${change.id} and slug = ${change.from}
      returning id`
    if (!row) {
      await sql`delete from product_slug_aliases where slug = ${change.from} and product_id = ${change.id}`
      continue
    }
    applied.push({ id: change.id, nameHr: change.nameHr, from: change.from, to })
  }
  return applied
}

function text(row, camel, snake) {
  const value = row?.[camel] ?? row?.[snake]
  return value == null ? '' : String(value)
}

export async function syncProductSlugs(sql) {
  await ensureSlugAliases(sql)
  const products = await sql`select id, slug, name_hr as "nameHr" from products order by id`
  const aliases = await sql`select slug, product_id as "productId" from product_slug_aliases`
  const plan = planSlugUpdates(
    products.map((row) => ({ id: Number(row.id), slug: text(row, 'slug', 'slug'), nameHr: text(row, 'nameHr', 'name_hr') })),
    aliases.map((row) => ({ slug: text(row, 'slug', 'slug'), productId: Number(row.productId ?? row.product_id) })),
  )
  return applySlugPlan(sql, plan)
}
