// Kreira/ažurira tablice u bazi. Pokreće se automatski prije svakog builda na Vercelu.
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('[migrate] DATABASE_URL nije postavljen - preskačem migraciju.')
  process.exit(0)
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })

const schema = `
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists products (
  id serial primary key,
  slug text unique not null,
  name_hr text not null,
  name_en text not null default '',
  short_hr text not null default '',
  short_en text not null default '',
  desc_hr text not null default '',
  desc_en text not null default '',
  price_cents int not null,
  compare_cents int,
  images jsonb not null default '[]',
  variants jsonb not null default '[]',
  fits text not null default '',
  stock int,
  active boolean not null default true,
  featured boolean not null default false,
  sort int not null default 0,
  sku text not null default '',
  material_hr text not null default '',
  material_en text not null default '',
  manufacturer text not null default '',
  eu_responsible text not null default '',
  safety_hr text not null default '',
  safety_en text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_history (
  id serial primary key,
  product_id int not null references products(id) on delete cascade,
  price_cents int not null,
  changed_at timestamptz not null default now()
);
create index if not exists price_history_product on price_history(product_id, changed_at);

create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  postal text not null default '',
  country text not null default 'HR',
  reset_token text,
  reset_expires timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  user_id int not null references users(id) on delete cascade,
  product_id int not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists orders (
  id serial primary key,
  public_id text unique not null,
  user_id int references users(id) on delete set null,
  status text not null default 'pending',
  email text not null,
  name text not null,
  phone text not null default '',
  address text not null,
  city text not null,
  postal text not null,
  country text not null default 'HR',
  note text not null default '',
  items jsonb not null,
  subtotal_cents int not null,
  shipping_cents int not null,
  total_cents int not null,
  locale text not null default 'hr',
  stripe_session_id text,
  stripe_payment_intent text,
  payment_method text,
  tracking text not null default '',
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orders_status on orders(status, created_at desc);
create index if not exists orders_user on orders(user_id);

create table if not exists invoices (
  id serial primary key,
  order_id int not null references orders(id) on delete restrict,
  year int not null,
  seq int not null,
  number text not null unique,
  issued_at timestamptz not null,
  total_cents int not null,
  payment_code text not null,
  storno_of int references invoices(id),
  zki text,
  jir text,
  fiscal_status text not null default 'off',
  fiscal_error text,
  fiscal_attempts int not null default 0,
  data jsonb not null,
  unique (year, seq)
);
create index if not exists invoices_order on invoices(order_id);
`

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
  console.error('[migrate] Greška:', e.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
