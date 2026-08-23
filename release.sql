-- PALM 50 — release.sql
-- Safe release migration for Telegram Stars purchases.
-- Adds only PALM 50 payment tables/indexes/functions and does not modify gameplay tables.

begin;

create extension if not exists pgcrypto;

create table if not exists public.palm50_purchases (
    id uuid primary key default gen_random_uuid(),

    -- Telegram user who made the purchase.
    telegram_user_id bigint not null,

    -- Product IDs used by PALM 50:
    -- royal_hand, meme_reactions, vip_reactions, palm_plus_monthly
    product_id text not null,

    -- Telegram Stars amount validated by the server.
    stars_amount integer not null check (stars_amount > 0),

    -- pending -> paid -> refunded
    status text not null default 'pending'
        check (status in ('pending', 'paid', 'refunded', 'cancelled', 'failed')),

    -- Unique payload embedded in the Telegram invoice.
    invoice_payload text not null,

    telegram_payment_charge_id text,
    provider_payment_charge_id text,

    -- Raw Telegram update/payment metadata when useful for support/debugging.
    payment_data jsonb not null default '{}'::jsonb,

    -- Used by PALM PLUS. NULL for permanent cosmetic purchases.
    premium_expires_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    paid_at timestamptz,
    refunded_at timestamptz
);

-- One invoice payload must never represent two purchases.
create unique index if not exists palm50_purchases_invoice_payload_uidx
    on public.palm50_purchases (invoice_payload);

-- Telegram charge IDs are unique when present.
create unique index if not exists palm50_purchases_tg_charge_uidx
    on public.palm50_purchases (telegram_payment_charge_id)
    where telegram_payment_charge_id is not null;

-- Fast entitlement lookup by Telegram user.
create index if not exists palm50_purchases_user_status_idx
    on public.palm50_purchases (telegram_user_id, status);

create index if not exists palm50_purchases_user_product_idx
    on public.palm50_purchases (telegram_user_id, product_id);

-- Prevent duplicate permanent Stars purchases for the same user/product.
-- PALM PLUS is excluded because it can be renewed after expiration.
create unique index if not exists palm50_permanent_entitlement_uidx
    on public.palm50_purchases (telegram_user_id, product_id)
    where status = 'paid'
      and product_id in ('royal_hand', 'meme_reactions', 'vip_reactions');

-- Keep updated_at current.
create or replace function public.palm50_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists palm50_purchases_set_updated_at on public.palm50_purchases;

create trigger palm50_purchases_set_updated_at
before update on public.palm50_purchases
for each row
execute function public.palm50_set_updated_at();

-- The browser must NOT be able to directly read/write purchases.
-- Vercel API routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
alter table public.palm50_purchases enable row level security;

revoke all on table public.palm50_purchases from anon, authenticated;
grant all on table public.palm50_purchases to service_role;

comment on table public.palm50_purchases is
'PALM 50 server-side Telegram Stars purchases and entitlements. Access through trusted backend only.';

commit;
