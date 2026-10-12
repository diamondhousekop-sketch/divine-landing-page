-- Shipping + COD handling fee are stored on each order so old invoices never change
-- when the owner edits shipping rules later. total_amount = items + shipping + cod fee.
alter table orders add column if not exists shipping_amount numeric(10,2) not null default 0 check (shipping_amount >= 0);
alter table orders add column if not exists cod_fee numeric(10,2) not null default 0 check (cod_fee >= 0);
comment on column orders.shipping_amount is 'Delivery charge included in total_amount (0 = free).';
comment on column orders.cod_fee is 'Cash-on-delivery handling fee included in total_amount.';
