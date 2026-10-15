// Shema baze. Idempotentna (create ... if not exists), koristi je scripts/migrate.mjs i admin panel.
export const SCHEMA = `
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

alter table invoices add column if not exists solo_id text;
alter table invoices add column if not exists solo_number text;
alter table invoices add column if not exists solo_pdf_url text;
alter table invoices add column if not exists solo_storno_at timestamptz;
create unique index if not exists invoices_one_original_per_order on invoices(order_id) where storno_of is null;

create table if not exists solo_api_guard (
  id int primary key default 1 check (id = 1),
  last_request_at timestamptz not null default '1970-01-01'::timestamptz
);

alter table products add column if not exists supplier_url text not null default '';
alter table products add column if not exists cost_cents int;
alter table orders add column if not exists supplier_order text not null default '';
alter table orders add column if not exists carrier text not null default '';
alter table orders add column if not exists tracking_url text not null default '';
alter table orders add column if not exists confirmation_email_sent_at timestamptz;
alter table orders add column if not exists confirmation_email_error text;
alter table orders add column if not exists shipped_email_sent_at timestamptz;
alter table orders add column if not exists shipped_email_error text;

create table if not exists product_proposals (
  id serial primary key,
  status text not null default 'draft',
  name_hr text not null default '',
  name_en text not null default '',
  short_hr text not null default '',
  short_en text not null default '',
  desc_hr text not null default '',
  desc_en text not null default '',
  images jsonb not null default '[]',
  variants jsonb not null default '[]',
  supplier_url text not null default '',
  cost_cents int,
  est_delivery_hr text not null default '',
  est_delivery_en text not null default '',
  weight_dims text not null default '',
  material_hr text not null default '',
  material_en text not null default '',
  manufacturer text not null default '',
  eu_responsible text not null default '',
  safety_hr text not null default '',
  safety_en text not null default '',
  quality_tags jsonb not null default '[]',
  notes text not null default '',
  sources text not null default '',
  reject_reason text,
  product_id int references products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_proposals_status on product_proposals(status, updated_at desc);

alter table products add column if not exists proposal_id int references product_proposals(id) on delete set null;

create table if not exists email_otp_codes (
  id serial primary key,
  email text not null,
  purpose text not null default 'auth',
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  ip_hash text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists email_otp_email on email_otp_codes(email, created_at desc);

create table if not exists auth_rate_limits (
  scope text not null,
  bucket_key text not null,
  hits int not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz,
  primary key (scope, bucket_key)
);

alter table users alter column password_hash drop not null;
alter table users add column if not exists email_verified_at timestamptz;

alter table orders add column if not exists review_request_sent_at timestamptz;
alter table orders add column if not exists review_request_error text;
create index if not exists orders_review_due on orders (shipped_at)
  where review_request_sent_at is null and status in ('shipped', 'delivered');

create table if not exists reviews (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  product_id int references products(id) on delete set null,
  item_index int not null,
  product_name text not null default '',
  variant text not null default '',
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  display_name text not null default '',
  locale text not null default 'hr',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  unique (order_id, item_index)
);
create index if not exists reviews_status_created on reviews (status, created_at desc);
create index if not exists reviews_product_public on reviews (product_id, created_at desc) where status = 'approved';

alter table orders add column if not exists discount_cents int not null default 0;
alter table orders add column if not exists invoice_email_sent_at timestamptz;
alter table orders add column if not exists invoice_email_error text;
alter table orders add column if not exists invoice_admin_notified_at timestamptz;

create table if not exists app_meta (
  key text primary key,
  value text not null
);

alter table products add column if not exists cj_pid text not null default '';
alter table products add column if not exists cj_vid text not null default '';
alter table products add column if not exists cj_sku text not null default '';

alter table orders add column if not exists cj_order_id text not null default '';
alter table orders add column if not exists cj_shipment_id text not null default '';
alter table orders add column if not exists cj_order_number text not null default '';
alter table orders add column if not exists cj_status text not null default '';
alter table orders add column if not exists cj_error text;
alter table orders add column if not exists cj_note text not null default '';
alter table orders add column if not exists cj_logistic text not null default '';
alter table orders add column if not exists cj_attempts int not null default 0;
alter table orders add column if not exists cj_updated_at timestamptz;
alter table orders add column if not exists cj_synced_at timestamptz;
alter table orders add column if not exists cj_next_retry_at timestamptz;
create unique index if not exists orders_cj_order_id on orders (cj_order_id) where cj_order_id <> '';
create unique index if not exists orders_cj_order_number on orders (cj_order_number) where cj_order_number <> '';
create index if not exists orders_cj_open on orders (paid_at) where status = 'paid' and cj_order_id = '';

create table if not exists supplier_api_tokens (
  id int primary key default 1 check (id = 1),
  access_token text not null default '',
  access_expires_at timestamptz,
  refresh_token text not null default '',
  refresh_expires_at timestamptz,
  open_id text not null default '',
  updated_at timestamptz not null default now(),
  last_auth_at timestamptz,
  last_error text
);

create table if not exists supplier_api_guard (
  id int primary key default 1 check (id = 1),
  last_request_at timestamptz not null default '1970-01-01'::timestamptz
);
`

// Neon dodaje channel_binding=require u connection string, a postgres.js ga šalje serveru kao nepoznat parametar
export function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
  if (!raw) return ''
  try {
    const u = new URL(raw)
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return raw
  }
}
