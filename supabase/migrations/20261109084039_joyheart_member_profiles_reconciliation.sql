-- JoyHeart profile reconciliation.
-- The existing production schema already has public.profiles from
-- 20261108205107_create_member_profiles. Evolve that table in place:
-- preserve age, gender, seeking, country, bio and is_visible; do not create
-- a competing profiles table or discard existing member data.
-- Requires 20261109090000_joyheart_private_birth_date_and_age_gate.sql first.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'JOYHEART_BASE_PROFILES_TABLE_REQUIRED';
  end if;
  if to_regclass('public.profile_private') is null then
    raise exception 'JOYHEART_PRIVATE_BIRTH_DATE_MIGRATION_REQUIRED';
  end if;
end;
$$;

alter table public.profiles
  add column if not exists publication_status text;

-- Preserve the existing visibility state when translating to the richer
-- moderation lifecycle.
update public.profiles
set publication_status = case when is_visible then 'published' else 'draft' end
where publication_status is null;

alter table public.profiles
  alter column publication_status set default 'draft',
  alter column publication_status set not null;

alter table public.profiles
  drop constraint if exists profiles_publication_status_check;
alter table public.profiles
  add constraint profiles_publication_status_check
  check (publication_status in ('draft', 'pending_review', 'published', 'paused', 'restricted'));

comment on column public.profiles.country is
  'ISO 3166-1 alpha-2 country code used by JoyHeart profile setup (for example KE or GB).';
comment on column public.profiles.bio is
  'Member-written public profile biography; max 500 characters.';
comment on column public.profiles.publication_status is
  'Moderation lifecycle. Only trusted staff may change publication status.';
comment on column public.profiles.age is
  'Age in completed years derived server-side from the private date of birth; never the date of birth itself.';

-- A trigger derives the public age from the private DOB table. The exact DOB
-- remains inaccessible to authenticated members.
create or replace function public.joyheart_set_profile_age_from_private_dob()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  birth_date date;
begin
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'JOYHEART_PROFILE_OWNER_MISMATCH' using errcode = '42501';
  end if;

  select pp.date_of_birth
    into birth_date
  from public.profile_private pp
  where pp.user_id = new.user_id;

  if birth_date is null then
    raise exception 'JOYHEART_PRIVATE_BIRTH_DATE_REQUIRED' using errcode = '23502';
  end if;

  new.age := extract(year from pg_catalog.age(current_date, birth_date))::smallint;
  if new.age < 18 or new.age > 120 then
    raise exception 'JOYHEART_MINIMUM_AGE_18' using errcode = '23514';
  end if;

  return new;
end;
$$;

alter function public.joyheart_set_profile_age_from_private_dob() owner to postgres;
revoke all on function public.joyheart_set_profile_age_from_private_dob()
  from public, anon, authenticated;

drop trigger if exists joyheart_profiles_set_private_age on public.profiles;
create trigger joyheart_profiles_set_private_age
  before insert or update on public.profiles
  for each row execute function public.joyheart_set_profile_age_from_private_dob();

-- Keep the old is_visible column synchronized for compatibility while the
-- new moderation lifecycle becomes the single source of truth.
create or replace function public.joyheart_guard_profile_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      if new.user_id is distinct from auth.uid()
         or new.publication_status <> 'draft'
         or new.is_visible is distinct from false then
        raise exception 'JOYHEART_PROFILE_MUST_START_AS_PRIVATE_DRAFT' using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.user_id is distinct from old.user_id then
        raise exception 'JOYHEART_PROFILE_OWNER_CANNOT_CHANGE' using errcode = '42501';
      end if;
      if new.publication_status is distinct from old.publication_status
         or new.is_visible is distinct from old.is_visible then
        raise exception 'JOYHEART_PROFILE_PUBLICATION_STAFF_ONLY' using errcode = '42501';
      end if;
    end if;
  end if;

  new.is_visible := (new.publication_status = 'published');
  return new;
end;
$$;

revoke all on function public.joyheart_guard_profile_write()
  from public, anon, authenticated;

drop trigger if exists joyheart_profiles_guard_write on public.profiles;
create trigger joyheart_profiles_guard_write
  before insert or update on public.profiles
  for each row execute function public.joyheart_guard_profile_write();

-- Replace the legacy visibility policies with equivalent moderation-aware
-- policies. Existing rows and existing columns remain in place.
drop policy if exists "Members can create their own profile" on public.profiles;
drop policy if exists "Members can update their own profile" on public.profiles;
drop policy if exists "Members can view visible profiles and their own" on public.profiles;
drop policy if exists "profiles_read_owner_or_published" on public.profiles;
drop policy if exists "profiles_insert_own_draft" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_read_owner_or_published"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()) or publication_status = 'published');

create policy "profiles_insert_own_draft"
  on public.profiles for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and publication_status = 'draft'
    and is_visible = false
  );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;
