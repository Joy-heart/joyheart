-- JoyHeart member profile foundation.
-- Review-only migration: do not apply to the live Supabase project until approved.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  country_code text not null,
  city text,
  about_me text,
  relationship_intention text not null,
  interests text[] not null default '{}',
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'pending_review', 'published', 'paused', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 2 and 40),
  constraint profiles_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint profiles_city_length check (city is null or char_length(city) <= 80),
  constraint profiles_about_me_length check (about_me is null or char_length(about_me) <= 500),
  constraint profiles_relationship_intention_length check (char_length(relationship_intention) between 2 and 60),
  constraint profiles_interests_count check (cardinality(interests) <= 20)
);

comment on table public.profiles is
  'Member-controlled discovery profile fields only. Never store exact date of birth, contact details, identity documents, or precise coordinates here.';
comment on column public.profiles.publication_status is
  'Changed only by trusted moderation workflow; members cannot publish or approve themselves.';

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_owner_or_published" on public.profiles;
create policy "profiles_read_owner_or_published"
  on public.profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or publication_status = 'published'
  );

drop policy if exists "profiles_insert_own_draft" on public.profiles;
create policy "profiles_insert_own_draft"
  on public.profiles for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and publication_status = 'draft'
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.joyheart_guard_profile_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() = 'authenticated' then
      if new.user_id is distinct from auth.uid()
         or new.publication_status <> 'draft' then
        raise exception 'Profiles must be created as the signed-in member draft';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Profile ownership cannot be changed';
    end if;
    if auth.role() = 'authenticated'
       and new.publication_status is distinct from old.publication_status then
      raise exception 'Profile publication status is managed by JoyHeart moderation';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.joyheart_guard_profile_write() from public, anon, authenticated;

drop trigger if exists joyheart_profiles_guard_write on public.profiles;
create trigger joyheart_profiles_guard_write
  before insert or update on public.profiles
  for each row execute function public.joyheart_guard_profile_write();

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- No DELETE policy or grant is provided. Account deletion is handled through
-- the trusted account-lifecycle workflow, not direct client deletion.
