-- Frigo Planner — schema V1
-- A "household" (foyer) groups 1-2 people who share one pantry/fridge.

create extension if not exists "pgcrypto";

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Notre foyer',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  sex text check (sex in ('femme', 'homme', 'autre')),
  height_cm numeric,
  weight_kg numeric,
  birth_date date,
  activity_level text check (activity_level in ('sedentaire', 'leger', 'modere', 'actif', 'tres_actif')),
  goal text check (goal in ('perte_de_poids', 'maintien', 'prise_de_masse')),
  daily_calorie_target numeric,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  barcode text,
  name text not null,
  brand text,
  category text,
  quantity numeric not null default 1,
  unit text not null default 'piece',
  image_url text,
  expiry_date date,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pantry_items_household_idx on pantry_items(household_id);
create index if not exists profiles_household_idx on profiles(household_id);

-- Helper: household of the currently authenticated user.
-- search_path pinned to public+pg_temp (avoids the Postgres "mutable
-- search_path" security warning while keeping unqualified table refs valid).
create or replace function my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select household_id from profiles where id = auth.uid();
$$;

alter table households enable row level security;
alter table profiles enable row level security;
alter table pantry_items enable row level security;

-- All policies are scoped `to authenticated` on purpose: anonymous
-- visitors have no legitimate reason to query these tables, and scoping
-- them out lets us also lock the RPC functions below to authenticated only.

-- households: a member can read/update their own household.
create policy "select own household" on households
  for select to authenticated using (id = my_household_id());

create policy "update own household" on households
  for update to authenticated using (id = my_household_id());

-- anyone authenticated can create a household (they then attach via profiles.household_id).
create policy "insert household" on households
  for insert to authenticated with check (true);

-- profiles: a user can always see/edit their own row, and see (not edit) their household mate's row.
create policy "select own profile" on profiles
  for select to authenticated using (id = auth.uid());

create policy "select household mate profile" on profiles
  for select to authenticated using (household_id = my_household_id());

create policy "insert own profile" on profiles
  for insert to authenticated with check (id = auth.uid());

create policy "update own profile" on profiles
  for update to authenticated using (id = auth.uid());

-- pantry_items: scoped to the household.
create policy "select household pantry" on pantry_items
  for select to authenticated using (household_id = my_household_id());

create policy "insert household pantry" on pantry_items
  for insert to authenticated with check (household_id = my_household_id());

create policy "update household pantry" on pantry_items
  for update to authenticated using (household_id = my_household_id());

create policy "delete household pantry" on pantry_items
  for delete to authenticated using (household_id = my_household_id());

-- Join an existing household by invite code (bypasses the household select
-- policy on purpose, via security definer, since the caller has no
-- household yet at the point they need to look the code up).
create or replace function join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_id uuid;
begin
  select id into target_id from households where invite_code = code;
  if target_id is null then
    raise exception 'Code d''invitation invalide';
  end if;

  update profiles set household_id = target_id where id = auth.uid();
  return target_id;
end;
$$;

-- Both RPC functions are SECURITY DEFINER and would otherwise be callable
-- by anyone, including unauthenticated visitors (e.g. to brute-force invite
-- codes). Lock execution down to signed-in users only.
revoke execute on function my_household_id() from public;
revoke execute on function join_household(text) from public;
grant execute on function my_household_id() to authenticated;
grant execute on function join_household(text) to authenticated;

