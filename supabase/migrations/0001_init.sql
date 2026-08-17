-- ═══════════════════════════════════════════════════════════════════════════
-- Diamond House — e-commerce schema (Supabase / Postgres)
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Idempotent-ish: uses IF NOT EXISTS / DROP POLICY IF EXISTS so it can be re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------- Enums ----------
do $$ begin
  create type payment_method as enum ('online', 'cod');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------- updated_at trigger helper ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- products ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  images jsonb not null default '[]'::jsonb,
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- testimonials ----------
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_city text,
  quote text not null,
  vimeo_url text,
  rating integer not null default 5 check (rating between 1 and 5),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  customer_address text not null,
  customer_pincode text not null,
  product_id uuid references products(id) on delete set null,
  quantity integer not null default 1 check (quantity >= 1),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  payment_method payment_method not null default 'cod',
  payment_status payment_status not null default 'pending',
  order_status order_status not null default 'placed',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ---------- site_content (admin-editable, publicly readable) ----------
create table if not exists site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_site_content_updated_at on site_content;
create trigger trg_site_content_updated_at before update on site_content
  for each row execute function set_updated_at();

-- ---------- admin_settings (secrets — service-role ONLY, never public) ----------
create table if not exists admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_admin_settings_updated_at on admin_settings;
create trigger trg_admin_settings_updated_at before update on admin_settings
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════
alter table products       enable row level security;
alter table testimonials   enable row level security;
alter table orders         enable row level security;
alter table site_content   enable row level security;
alter table admin_settings enable row level security;

-- Public read: only active products / testimonials.
drop policy if exists "public read active products" on products;
create policy "public read active products" on products
  for select using (is_active = true);

drop policy if exists "public read active testimonials" on testimonials;
create policy "public read active testimonials" on testimonials
  for select using (is_active = true);

-- Public read of site_content (hero text, pricing, announcement bar).
drop policy if exists "public read site_content" on site_content;
create policy "public read site_content" on site_content
  for select using (true);

-- orders  -> NO public policies at all: anon/authenticated fully denied.
--            All order writes/reads happen via the service role in server routes.
-- admin_settings -> NO public policies: secrets only reachable via service role.
-- (RLS enabled + no policy == deny for anon & authenticated. Service role bypasses RLS.)

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data (safe to re-run)
-- ═══════════════════════════════════════════════════════════════════════════
insert into products (name, description, price, compare_at_price, images, stock_quantity, is_active)
select
  'इच्छापूर्ती लकी स्टोन',
  'शास्त्रोक्त पद्धतीने सिद्ध केलेले खरे शुभरत्न — Diamond House, कोल्हापूर.',
  1100, 2100, '[]'::jsonb, 100, true
where not exists (select 1 from products);

insert into testimonials (customer_name, customer_city, quote, rating, display_order, is_active)
select * from (values
  ('राजू पाटील',    'कोल्हापूर',   'दुकानातील अनुभव खूप छान. मनाला शांती मिळाली.',        5, 1, true),
  ('सुनिता देशमुख', 'इचलकरंजी',    'घरातलं वातावरण आता खूप सकारात्मक वाटतं.',            5, 2, true),
  ('अमोल कदम',      'सांगली',      'व्यवसायात नवा उत्साह जाणवतोय. धन्यवाद स्वामी.',       5, 3, true),
  ('प्रिया जाधव',   'सातारा',      'पॅकिंग आणि डिलिव्हरी अगदी सुरक्षित होती.',           5, 4, true)
) as t(customer_name, customer_city, quote, rating, display_order, is_active)
where not exists (select 1 from testimonials);

insert into site_content (key, value) values
  ('hero_badge',       '"ॐ श्री स्वामी समर्थ · Diamond House, कोल्हापूर"'::jsonb),
  ('hero_headline',    '"स्वामींचा आशीर्वाद, तुमच्या हातात"'::jsonb),
  ('hero_subheadline', '"Kolhapur''s Trusted Icchapurti Lucky Stone — 25+ Years of Genuine Blessings"'::jsonb),
  ('announcement',     '"मर्यादित स्टॉक — फक्त कोल्हापूर विभागासाठी · Cash on Delivery व UPI उपलब्ध"'::jsonb)
on conflict (key) do nothing;

insert into admin_settings (key, value) values
  ('razorpay', '{"key_id":"","key_secret":"","webhook_secret":"","enabled":false}'::jsonb)
on conflict (key) do nothing;
