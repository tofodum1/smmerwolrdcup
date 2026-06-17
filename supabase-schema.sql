-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query -> Run)
-- This REPLACES the previous schema. If you already have a `registrations` table from
-- before, run the migration block at the bottom instead of the create table statement.

-- ============================================================
-- FRESH SETUP (if you don't have a registrations table yet)
-- ============================================================
create table if not exists registrations (
  id text primary key,
  type text not null check (type in ('squad','solo')),
  squad_name text,
  captain_name text,
  player_name text,
  contact text not null,
  email text not null,
  roster integer,
  players jsonb,
  country text,
  group_key text,
  amount_paid integer not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','paid')),
  confirmation_code text,
  stripe_session_id text,
  registered_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists idx_registrations_status on registrations(status);
create index if not exists idx_registrations_stripe_session on registrations(stripe_session_id);

-- Row Level Security: the public anon key (used by the registration page)
-- can INSERT a new pending registration and SELECT rows to render the
-- country/group boards. It can NOT delete anything, and the app code only
-- selects non-sensitive columns (country, group_key, type, squad_name,
-- status) for that board view -- see src/App.jsx. Contact info and
-- confirmation codes are only ever read server-side with the service role
-- key inside the /api functions, never via the public anon client.
alter table registrations enable row level security;

drop policy if exists "public read" on registrations;
drop policy if exists "public insert" on registrations;
drop policy if exists "public delete" on registrations;

create policy "public can insert awaiting registration" on registrations
  for insert with check (status = 'awaiting_payment');

create policy "public can read for board display" on registrations
  for select using (true);

-- No public update or delete policy is created, so the anon key cannot
-- modify or delete rows. Verification and admin deletion happen only
-- through the /api functions using the service role key.

-- ============================================================
-- MIGRATION (if you already have an old registrations table)
-- ============================================================
-- Uncomment and run this block instead if upgrading from the old schema:
--
-- alter table registrations add column if not exists email text;
-- alter table registrations add column if not exists status text not null default 'verified';
-- alter table registrations add column if not exists confirmation_code text;
-- alter table registrations add column if not exists stripe_session_id text;
-- alter table registrations add column if not exists verified_at timestamptz;
-- alter table registrations alter column country drop not null;
-- alter table registrations alter column group_key drop not null;
--
-- drop policy if exists "public read" on registrations;
-- drop policy if exists "public insert" on registrations;
-- drop policy if exists "public delete" on registrations;
--
-- create policy "public can insert pending registration" on registrations
--   for insert with check (status = 'pending_payment');
-- create policy "public can read for board display" on registrations
--   for select using (true);

-- ============================================================
-- MIGRATION (upgrading from the Stripe-webhook version to the
-- manual-confirmation version -- run this if you already had the
-- 'pending_payment' / 'paid_unverified' / 'verified' statuses)
-- ============================================================
-- alter table registrations drop constraint if exists registrations_status_check;
-- update registrations set status = 'awaiting_payment' where status = 'pending_payment';
-- update registrations set status = 'paid' where status in ('paid_unverified', 'verified');
-- alter table registrations add constraint registrations_status_check
--   check (status in ('awaiting_payment','paid'));
-- alter table registrations alter column status set default 'awaiting_payment';
