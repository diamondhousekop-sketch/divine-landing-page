-- ═══════════════════════════════════════════════════════════════════════════
-- Diamond House — schema update 2: uploadable media
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql.
-- Idempotent-ish: uses IF NOT EXISTS / DROP POLICY IF EXISTS so it can be
-- re-run safely.
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------- new columns ----------
alter table products     add column if not exists video_url text;
alter table testimonials add column if not exists customer_photo_url text;
-- (products.images already exists as jsonb[] from 0001_init.sql — used as the
--  gallery/slider array; no new column needed for that.)

-- ---------- storage bucket for all site-uploaded media ----------
-- One shared public-read bucket for hero banner, product images, and
-- testimonial photos. Uploads are written only by the server (service role),
-- reads are public (these are all public-facing marketing images).
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read site-assets" on storage.objects;
create policy "public read site-assets" on storage.objects
  for select
  using (bucket_id = 'site-assets');

-- No insert/update/delete policy for anon/authenticated is created here on
-- purpose: uploads go through the server using the service-role key, which
-- bypasses RLS entirely. This keeps the bucket write-protected.
