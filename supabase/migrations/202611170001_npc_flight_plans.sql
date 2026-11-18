-- First persisted operational record type for Northern Pacific Cargo.
-- Each signed-in user can only see and edit records they own.
create table if not exists public.npc_flight_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  callsign text not null check (char_length(callsign) between 2 and 20),
  origin text not null default 'CZST' check (origin ~ '^[A-Z0-9]{4}$'),
  destination text check (destination is null or destination ~ '^[A-Z0-9]{4}$'),
  departure_at timestamptz,
  cargo_description text,
  cargo_weight_kg numeric(8, 2) check (cargo_weight_kg is null or cargo_weight_kg >= 0),
  status text not null default 'draft' check (status in ('draft', 'planned', 'awaiting_dispatch')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists npc_flight_plans_owner_created_idx
  on public.npc_flight_plans (owner_id, created_at desc);

alter table public.npc_flight_plans enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.npc_flight_plans to authenticated;
revoke all on public.npc_flight_plans from anon;

drop policy if exists "Users read their own flight plans" on public.npc_flight_plans;
create policy "Users read their own flight plans"
  on public.npc_flight_plans for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users create their own flight plans" on public.npc_flight_plans;
create policy "Users create their own flight plans"
  on public.npc_flight_plans for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users update their own flight plans" on public.npc_flight_plans;
create policy "Users update their own flight plans"
  on public.npc_flight_plans for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users delete their own flight plans" on public.npc_flight_plans;
create policy "Users delete their own flight plans"
  on public.npc_flight_plans for delete to authenticated
  using ((select auth.uid()) = owner_id);
