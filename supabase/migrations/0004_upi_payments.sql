-- ═══════════════════════════════════════════════════════════════════════════
-- Diamond House — schema update 4: direct UPI payments (no gateway)
-- Run AFTER 0001–0003. Purely additive & idempotent: safe to re-run, existing
-- COD / Razorpay orders are untouched.
--
-- Flow: customer pays the store's UPI ID from their UPI app → uploads the
-- payment screenshot (+ optional UTR) on the checkout page → order shows in
-- Admin as "verifying" → owner checks their bank/UPI app → approves/rejects.
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------- enum values ----------
alter type payment_method add value if not exists 'upi';
-- 'verifying' = customer submitted proof, waiting for owner to check the bank app
alter type payment_status add value if not exists 'verifying';

-- ---------- order columns ----------
alter table orders add column if not exists upi_utr text;
alter table orders add column if not exists payment_proof_path text;
alter table orders add column if not exists payment_submitted_at timestamptz;
alter table orders add column if not exists payment_verified_at timestamptz;
alter table orders add column if not exists payment_note text;

comment on column orders.upi_utr is
  'UPI transaction reference (UTR) typed by the customer. Optional, unique when present.';
comment on column orders.payment_proof_path is
  'Object path of the payment screenshot in the PRIVATE payment-proofs bucket.';

-- One UTR can never be used for two orders (stops "one payment, many orders").
create unique index if not exists orders_upi_utr_unique
  on orders (upi_utr) where upi_utr is not null;

-- ---------- PRIVATE bucket for payment screenshots ----------
-- public = false and NO storage policies: anon/authenticated cannot read or
-- write. Only the server (service role) uploads, and admins view through
-- short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- settings row (owner fills it from Admin → Integrations) ----------
insert into admin_settings (key, value) values
  ('upi', '{"enabled":false,"upi_id":"","payee_name":""}'::jsonb)
on conflict (key) do nothing;
