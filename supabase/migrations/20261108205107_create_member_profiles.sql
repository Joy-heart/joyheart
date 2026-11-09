-- JoyHeart original member profile table.
-- This migration is already recorded in the connected production project's
-- migration history. It is retained here so the repository documents the
-- existing schema that later reconciliation migrations evolve.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  age smallint not null,
  country text not null,
  city text,
  gender text not null,
  seeking text not null,
  relationship_intention text not null,
  interests text[] not null default '{}',
  bio text not null default '',
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_age_check check (age >= 18 and age <= 120),
  constraint profiles_bio_check check (char_length(bio) <= 500),
  constraint profiles_city_check check (city is null or char_length(btrim(city)) <= 80),
  constraint profiles_country_check check (char_length(btrim(country)) >= 2 and char_length(btrim(country)) <= 80),
  constraint profiles_display_name_check check (char_length(btrim(display_name)) >= 2 and char_length(btrim(display_name)) <= 60),
  constraint profiles_gender_check check (char_length(btrim(gender)) >= 1 and char_length(btrim(gender)) <= 40),
  constraint profiles_interests_check check (cardinality(interests) <= 20),
  constraint profiles_relationship_intention_check check (char_length(btrim(relationship_intention)) >= 2 and char_length(btrim(relationship_intention)) <= 80),
  constraint profiles_seeking_check check (char_length(btrim(seeking)) >= 1 and char_length(btrim(seeking)) <= 40)
);

alter table public.profiles enable row level security;

create policy "Members can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id and age >= 18);

create policy "Members can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and age >= 18);

create policy "Members can view visible profiles and their own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id or is_visible = true);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;
