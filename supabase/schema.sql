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
  goal text check (goal in ('perte_de_poids', 'maintien', 'prise_de_masse', 'recomposition')),
  daily_calorie_target numeric,
  dietary_preferences text,
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
  nutriscore text,
  nutrients jsonb,
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

-- Create a brand new household for the caller. Runs as SECURITY DEFINER so
-- it bypasses RLS: at the point of creation the caller isn't linked to any
-- household yet, so the ordinary INSERT/SELECT policies can't be satisfied
-- for a plain client-side insert.
create or replace function create_household()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
begin
  insert into households default values returning id into new_id;
  return new_id;
end;
$$;

-- Auto-create a profiles row whenever a new auth.users row appears — fires
-- immediately on signup, before email confirmation, so it never races with
-- the "does the caller have a session yet" problem a client-side insert has.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Nouvel utilisateur'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Both RPC functions are SECURITY DEFINER and would otherwise be callable
-- by anyone, including unauthenticated visitors (e.g. to brute-force invite
-- codes). Lock execution down to signed-in users only.
revoke execute on function my_household_id() from public;
revoke execute on function join_household(text) from public;
revoke execute on function create_household() from public;
grant execute on function my_household_id() to authenticated;
grant execute on function join_household(text) to authenticated;
grant execute on function create_household() to authenticated;

-- Shopping list: manual entries + missing ingredients pushed from recipes.
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  checked boolean not null default false,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_household_idx on shopping_items(household_id);

-- Saved recipes, kept independently of whatever the AI last generated.
create table if not exists favorite_recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  added_by uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  servings numeric not null default 1,
  estimated_calories_per_serving numeric,
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists favorite_recipes_household_idx on favorite_recipes(household_id);

-- Tracks how often each product gets added, to power one-tap "quick add".
-- Deliberately no unique constraint: lookups/upserts are done in application
-- code (same top-up-by-barcode pattern as pantry_items) since a partial
-- unique index (barcode set vs. null) can't be targeted by a plain upsert.
create table if not exists frequent_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  barcode text,
  name text not null,
  brand text,
  category text,
  unit text not null default 'piece',
  default_quantity numeric not null default 1,
  times_added integer not null default 1,
  last_added_at timestamptz not null default now()
);
create index if not exists frequent_items_household_idx on frequent_items(household_id, times_added desc);

-- One row per "recette marquée préparée", household-level (not per-member —
-- this is a couple's shared stock/goals app, not a per-person food diary).
create table if not exists nutrition_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  logged_by uuid references profiles(id) on delete set null,
  recipe_title text not null,
  calories_per_serving numeric not null default 0,
  servings numeric not null default 1,
  consumed_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists nutrition_log_household_idx on nutrition_log(household_id, consumed_at);

-- Weekly meal plan: one optional recipe per day/slot, sourced from favorites.
create table if not exists meal_plan (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  plan_date date not null,
  meal_slot text not null check (meal_slot in ('dejeuner', 'diner')),
  title text not null,
  servings numeric not null default 1,
  estimated_calories_per_serving numeric,
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  favorite_recipe_id uuid references favorite_recipes(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, plan_date, meal_slot)
);
create index if not exists meal_plan_household_idx on meal_plan(household_id, plan_date);

alter table shopping_items enable row level security;
alter table favorite_recipes enable row level security;
alter table frequent_items enable row level security;
alter table nutrition_log enable row level security;
alter table meal_plan enable row level security;

create policy "select household shopping" on shopping_items for select to authenticated using (household_id = my_household_id());
create policy "insert household shopping" on shopping_items for insert to authenticated with check (household_id = my_household_id());
create policy "update household shopping" on shopping_items for update to authenticated using (household_id = my_household_id());
create policy "delete household shopping" on shopping_items for delete to authenticated using (household_id = my_household_id());

create policy "select household favorites" on favorite_recipes for select to authenticated using (household_id = my_household_id());
create policy "insert household favorites" on favorite_recipes for insert to authenticated with check (household_id = my_household_id());
create policy "delete household favorites" on favorite_recipes for delete to authenticated using (household_id = my_household_id());

create policy "select household frequent items" on frequent_items for select to authenticated using (household_id = my_household_id());
create policy "insert household frequent items" on frequent_items for insert to authenticated with check (household_id = my_household_id());
create policy "update household frequent items" on frequent_items for update to authenticated using (household_id = my_household_id());

create policy "select household nutrition log" on nutrition_log for select to authenticated using (household_id = my_household_id());
create policy "insert household nutrition log" on nutrition_log for insert to authenticated with check (household_id = my_household_id());

create policy "select household meal plan" on meal_plan for select to authenticated using (household_id = my_household_id());
create policy "insert household meal plan" on meal_plan for insert to authenticated with check (household_id = my_household_id());
create policy "update household meal plan" on meal_plan for update to authenticated using (household_id = my_household_id());
create policy "delete household meal plan" on meal_plan for delete to authenticated using (household_id = my_household_id());

