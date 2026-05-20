-- Phase 2 identity layer for Discord/Supabase Auth.
-- Run this after enabling the Discord provider in Supabase Auth.
-- This does not delete or replace the existing campaign_states tables.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  provider text not null default 'discord',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('dm','player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.account_characters (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Player',
  character jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_characters (
  campaign_id text not null,
  character_id text not null references public.account_characters(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  controller_user_id uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, character_id)
);

create table if not exists public.trade_offers (
  id text primary key,
  campaign_id text not null,
  from_character_id text not null,
  to_character_id text not null,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  offered jsonb not null default '{}'::jsonb,
  requested jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;
alter table public.campaign_members enable row level security;
alter table public.account_characters enable row level security;
alter table public.campaign_characters enable row level security;
alter table public.trade_offers enable row level security;

drop policy if exists "Profiles are readable to authenticated users" on public.player_profiles;
drop policy if exists "Users can upsert their profile" on public.player_profiles;
create policy "Profiles are readable to authenticated users"
on public.player_profiles for select to authenticated using (true);
create policy "Users can upsert their profile"
on public.player_profiles for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Members can read campaign memberships" on public.campaign_members;
drop policy if exists "Users can join campaigns" on public.campaign_members;
create policy "Members can read campaign memberships"
on public.campaign_members for select to authenticated using (true);
create policy "Users can join campaigns"
on public.campaign_members for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read their account characters" on public.account_characters;
drop policy if exists "Users manage their account characters" on public.account_characters;
create policy "Users read their account characters"
on public.account_characters for select to authenticated
using (auth.uid() = owner_user_id);
create policy "Users manage their account characters"
on public.account_characters for all to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Campaign characters are readable" on public.campaign_characters;
drop policy if exists "Owners manage campaign characters" on public.campaign_characters;
create policy "Campaign characters are readable"
on public.campaign_characters for select to authenticated using (true);
create policy "Owners manage campaign characters"
on public.campaign_characters for all to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Trade participants read offers" on public.trade_offers;
drop policy if exists "Trade participants create offers" on public.trade_offers;
drop policy if exists "Trade recipients update offers" on public.trade_offers;
create policy "Trade participants read offers"
on public.trade_offers for select to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "Trade participants create offers"
on public.trade_offers for insert to authenticated
with check (auth.uid() = from_user_id);
create policy "Trade recipients update offers"
on public.trade_offers for update to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id)
with check (auth.uid() = from_user_id or auth.uid() = to_user_id);
