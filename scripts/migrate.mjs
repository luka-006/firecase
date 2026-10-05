// Kreira/ažurira tablice u bazi. Pokreće se automatski prije svakog builda na Vercelu.
import postgres from 'postgres'
import { SCHEMA as schema, databaseUrl } from '../lib/schema.mjs'

const url = databaseUrl()
if (!url) {
  console.log('[migrate] DATABASE_URL nije postavljen - preskačem migraciju.')
  process.exit(0)
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })


const sizes = [{ hr: 'BIC J6 (standardni)', en: 'BIC J6 (regular)' }, { hr: 'BIC J3 (mini)', en: 'BIC J3 (mini)' }]
const samples = [
  {
    slug: 'firecase-classic',
    name_hr: 'Firecase Classic',
    name_en: 'Firecase Classic',
    short_hr: 'Futrola za upaljač čistih linija.',
    short_en: 'A lighter case with clean lines.',
    desc_hr: 'PRIMJER PROIZVODA – zamijeni ili obriši u admin panelu.',
    desc_en: 'SAMPLE PRODUCT – replace or delete in the admin panel.',
    price_cents: 1499, featured: true, sort: 1,
    images: ['/products/sample-j6.svg'],
    variants: sizes,
  },
  {
    slug: 'firecase-noir',
    name_hr: 'Firecase Noir',
    name_en: 'Firecase Noir',
    short_hr: 'Futrola za upaljač u tamnoj izvedbi.',
    short_en: 'A lighter case in a dark finish.',
    desc_hr: 'PRIMJER PROIZVODA – zamijeni ili obriši u admin panelu.',
    desc_en: 'SAMPLE PRODUCT – replace or delete in the admin panel.',
    price_cents: 1699, featured: true, sort: 2,
    images: ['/products/sample-j3.svg'],
    variants: sizes,
  },
]

try {
  await sql.unsafe(schema)
  // Stari zadani rok dostave (ako nije ručno mijenjan u adminu) -> 4–8 dana
  await sql`update settings set value = value || '{"deliveryHr":"4–8 dana","deliveryEn":"4–8 days"}'::jsonb
    where key = 'main' and value->>'deliveryHr' = '3–7 radnih dana'`
  const [{ count }] = await sql`select count(*)::int as count from products`
  if (count === 0) {
    for (const p of samples) {
      const [row] = await sql`insert into products ${sql({ ...p, images: sql.json(p.images), variants: sql.json(p.variants) })} returning id`
      await sql`insert into price_history (product_id, price_cents) values (${row.id}, ${p.price_cents})`
    }
    console.log('[migrate] Dodani primjeri proizvoda.')
  }
  console.log('[migrate] Baza je spremna.')
} catch (e) {
  // Ne rušimo build: stranica se objavi, a tablice se mogu kreirati gumbom u /admin
  console.warn('[migrate] Migracija nije uspjela, nastavljam build:', e.message)
} finally {
  await sql.end()
}
