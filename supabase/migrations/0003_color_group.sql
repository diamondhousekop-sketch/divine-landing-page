-- ═══════════════════════════════════════════════════════════════════════════
-- Diamond House — schema update 3: name-based lucky color on orders
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql and
-- 0002_uploadable_media.sql.
-- ═══════════════════════════════════════════════════════════════════════════

alter table orders add column if not exists color_group text;
alter table orders add column if not exists color_letter text;

comment on column orders.color_group is
  'Which color stone to pack/ship — one of: red, white, green, yellow, grey. '
  'Determined by the customer''s name-letter, chosen at checkout.';
comment on column orders.color_letter is
  'The Devanagari name-letter the customer selected (for reference/support use).';
