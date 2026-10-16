// Kreira/ažurira tablice u bazi. Pokreće se automatski prije svakog builda na Vercelu.
import postgres from 'postgres'
import { takeOrderNumber } from '../lib/order-number.mjs'
import { SCHEMA as schema, databaseUrl } from '../lib/schema.mjs'

const url = databaseUrl()
if (!url) {
  console.log('[migrate] DATABASE_URL nije postavljen - preskačem migraciju.')
  process.exit(0)
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })


const sizes = [{ hr: 'BIC J6 (standardni)', en: 'BIC J6 (regular)' }, { hr: 'BIC J3 (mini)', en: 'BIC J3 (mini)' }]
const zephyrDescHr = 'Futrola čistih linija.\n\nKompatibilnost: za BIC J6, za BIC J3'
const zephyrDescEn = 'A lighter case with clean lines.\n\nCompatibility: for BIC J6, for BIC J3'
const noirDescHr = 'Futrola u tamnoj izvedbi.\n\nKompatibilnost: za BIC J6, za BIC J3\nZavršna obrada: tamna'
const noirDescEn = 'A lighter case in a dark finish.\n\nCompatibility: for BIC J6, for BIC J3\nFinish: dark'
const samples = [
  {
    slug: 'zephyr',
    name_hr: 'Zephyr',
    name_en: 'Zephyr',
    short_hr: 'Futrola čistih linija.',
    short_en: 'A lighter case with clean lines.',
    desc_hr: zephyrDescHr,
    desc_en: zephyrDescEn,
    price_cents: 1499, featured: true, sort: 1,
    images: ['/products/sample-j6.svg'],
    variants: sizes,
  },
  {
    slug: 'noir',
    name_hr: 'Noir',
    name_en: 'Noir',
    short_hr: 'Futrola u tamnoj izvedbi.',
    short_en: 'A lighter case in a dark finish.',
    desc_hr: noirDescHr,
    desc_en: noirDescEn,
    price_cents: 1699, featured: true, sort: 2,
    images: ['/products/sample-j3.svg'],
    variants: sizes,
  },
]

const COLOUR = /^(?:mat|matte|brushed|polished|tamna|svijetla|light|dark)?\s*(crna|crni|crno|bijela|bijeli|bijelo|srebrna|srebrni|srebro|zlatna|zlatni|zlato|smeđa|smeđi|plava|plavi|zelena|zeleni|crvena|crveni|siva|sivi|bež|roza|pink|black|white|silver|gold|brown|blue|green|red|grey|gray|beige|ivory|navy|bronze|gunmetal|copper|noir)$/i

function bicLabels(variants) {
  const out = []
  for (const v of variants || []) {
    const m = `${v.hr || ''} ${v.en || ''}`.match(/BIC\s*J\s*(\d+)/i)
    if (!m) continue
    const label = `BIC J${m[1]}`
    if (!out.includes(label)) out.push(label)
  }
  return out
}

function colourNames(variants) {
  const hr = []
  const en = []
  for (const v of variants || []) {
    const h = (v.hr || '').trim()
    const e = (v.en || h).trim()
    if (/BIC/i.test(h) || /BIC/i.test(e) || (!COLOUR.test(h) && !COLOUR.test(e))) return { hr: [], en: [] }
    hr.push(h)
    en.push(e)
  }
  return { hr, en }
}

function knownSentence(s) {
  const t = (s || '').trim()
  if (!t || /PRIMJER PROIZVODA|SAMPLE PRODUCT/i.test(t)) return ''
  return /[.!?]$/.test(t) ? t : `${t}.`
}

function composeDesc(sentHr, sentEn, variants, materialHr, materialEn, finishHr, finishEn) {
  const bics = bicLabels(variants)
  const colours = colourNames(variants)
  const specHr = []
  const specEn = []
  if (materialHr) specHr.push(`Materijal: ${materialHr}`)
  if (materialEn || materialHr) specEn.push(`Material: ${materialEn || materialHr}`)
  if (bics.length) {
    specHr.push(`Kompatibilnost: ${bics.map((b) => `za ${b}`).join(', ')}`)
    specEn.push(`Compatibility: ${bics.map((b) => `for ${b}`).join(', ')}`)
  }
  if (colours.hr.length) {
    specHr.push(`Boje: ${colours.hr.join(', ')}`)
    specEn.push(`Colours: ${colours.en.join(', ')}`)
  }
  if (finishHr) specHr.push(`Završna obrada: ${finishHr}`)
  if (finishEn) specEn.push(`Finish: ${finishEn}`)
  return {
    descHr: [sentHr, specHr.join('\n')].filter(Boolean).join('\n\n'),
    descEn: [sentEn, specEn.join('\n')].filter(Boolean).join('\n\n'),
  }
}

async function rewriteProductCopy() {
  const [flag] = await sql`select value from app_meta where key = 'product_copy_v1'`
  if (flag) return
  const rows = await sql`select id, slug, short_hr, short_en, material_hr, material_en, variants from products`
  const named = {
    'firecase-classic': { slug: 'zephyr', name_hr: 'Zephyr', name_en: 'Zephyr', short_hr: 'Futrola čistih linija.', short_en: 'A lighter case with clean lines.', finish_hr: '', finish_en: '' },
    zephyr: { slug: 'zephyr', name_hr: 'Zephyr', name_en: 'Zephyr', short_hr: 'Futrola čistih linija.', short_en: 'A lighter case with clean lines.', finish_hr: '', finish_en: '' },
    'firecase-noir': { slug: 'noir', name_hr: 'Noir', name_en: 'Noir', short_hr: 'Futrola u tamnoj izvedbi.', short_en: 'A lighter case in a dark finish.', finish_hr: 'tamna', finish_en: 'dark' },
    noir: { slug: 'noir', name_hr: 'Noir', name_en: 'Noir', short_hr: 'Futrola u tamnoj izvedbi.', short_en: 'A lighter case in a dark finish.', finish_hr: 'tamna', finish_en: 'dark' },
  }
  for (const row of rows) {
    const spec = named[row.slug]
    const variants = row.variants || []
    if (spec) {
      const copy = composeDesc(spec.short_hr, spec.short_en, variants, row.material_hr, row.material_en, spec.finish_hr, spec.finish_en)
      let slug = spec.slug
      if (slug !== row.slug) {
        const clash = await sql`select 1 from products where slug = ${slug} and id <> ${row.id}`
        if (clash.length) slug = row.slug
      }
      await sql`update products set slug = ${slug}, name_hr = ${spec.name_hr}, name_en = ${spec.name_en},
        short_hr = ${spec.short_hr}, short_en = ${spec.short_en}, desc_hr = ${copy.descHr}, desc_en = ${copy.descEn}
        where id = ${row.id}`
    } else {
      const copy = composeDesc(knownSentence(row.short_hr), knownSentence(row.short_en), variants, row.material_hr, row.material_en, '', '')
      await sql`update products set desc_hr = ${copy.descHr}, desc_en = ${copy.descEn} where id = ${row.id}`
    }
  }
  await sql`insert into app_meta (key, value) values ('product_copy_v1', '1') on conflict (key) do nothing`
}

try {
  await sql.unsafe(schema)
  // Stari zadani rok (ako nije ručno mijenjan u adminu) -> 8–16 dana
  await sql`update settings set value = value || '{"deliveryHr":"8–16 dana","deliveryEn":"8–16 days"}'::jsonb
    where key = 'main' and value->>'deliveryHr' in ('3–7 radnih dana', '4–8 dana')`
  // Stari prag besplatne dostave (30 €) -> 40 €, samo ako admin nije upisao drugi iznos.
  await sql`update settings set value = jsonb_set(value, '{freeThresholdCents}', '4000'::jsonb)
    where key = 'main' and coalesce((value->>'freeThresholdCents')::int, 3000) = 3000`
  await sql`update settings set value = jsonb_set(
      jsonb_set(value, '{announcementHr}', to_jsonb(replace(replace(coalesce(value->>'announcementHr', ''), 'iznad 30', 'od 40'), '30 €', '40 €'))),
      '{announcementEn}', to_jsonb(replace(replace(replace(coalesce(value->>'announcementEn', ''), 'over €30', 'from €40'), '€30', '€40'), 'over 30', 'from 40'))
    )
    where key = 'main' and (coalesce(value->>'announcementHr', '') ~ '30' or coalesce(value->>'announcementEn', '') ~ '30')`
  const pending = await sql`select id from orders where order_number is null order by id`
  const taken = await sql`select order_number from orders where order_number is not null`
  const used = new Set(taken.map((r) => r.order_number))
  for (const row of pending) {
    const n = takeOrderNumber(used)
    await sql`update orders set order_number = ${n} where id = ${row.id}`
  }
  await sql`alter table orders alter column order_number set not null`
  await sql`update invoices i set data = jsonb_set(coalesce(i.data, '{}'::jsonb), '{orderNumber}', to_jsonb(o.order_number))
    from orders o
    where o.id = i.order_id and o.order_number is not null and (i.data->>'orderNumber') is null`
  const [{ count }] = await sql`select count(*)::int as count from products`
  if (count === 0) {
    for (const p of samples) {
      const [row] = await sql`insert into products ${sql({ ...p, images: sql.json(p.images), variants: sql.json(p.variants) })} returning id`
      await sql`insert into price_history (product_id, price_cents) values (${row.id}, ${p.price_cents})`
    }
    console.log('[migrate] Dodani primjeri proizvoda.')
  }
  await rewriteProductCopy()
  console.log('[migrate] Baza je spremna.')
} catch (e) {
  // Ne rušimo build: stranica se objavi, a tablice se mogu kreirati gumbom u /admin
  console.warn('[migrate] Migracija nije uspjela, nastavljam build:', e.message)
} finally {
  await sql.end()
}
