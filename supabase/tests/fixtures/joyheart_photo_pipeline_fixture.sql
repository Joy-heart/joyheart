-- Synthetic-only fixture for the JoyHeart Round 5B migration.
-- Runs in a disposable PostgreSQL 17 database; never points at Supabase production.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create schema storage;
create schema private;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant usage on schema private to service_role;

create table auth.users (
  id uuid primary key,
  email_confirmed_at timestamptz,
  deleted_at timestamptz,
  banned_until timestamptz
);

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create or replace function auth.role()
returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;
grant execute on function auth.uid() to public;
grant execute on function auth.role() to public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  publication_status text not null default 'draft',
  is_visible boolean not null default false
);
create table public.profile_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date not null
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes integer not null,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text,
  constraint profile_photos_mime_type_check check (mime_type in ('image/jpeg','image/png','image/webp')),
  constraint profile_photos_file_size_bytes_check check (file_size_bytes between 1 and 5242880),
  constraint profile_photos_moderation_status_check check (moderation_status in ('pending','approved','rejected','removed')),
  constraint profile_photos_storage_path_owner check (storage_path like user_id::text || '/%'),
  constraint profile_photos_review_reason_length check (review_reason is null or char_length(review_reason) <= 500)
);
alter table public.profile_photos enable row level security;

-- The production profile-photo limit trigger already exists before Round 5B.
create or replace function public.joyheart_enforce_profile_photo_limit()
returns trigger language plpgsql set search_path = '' as $$
declare current_count integer;
begin
  select count(*)::integer into current_count
  from public.profile_photos
  where user_id = new.user_id and moderation_status <> 'removed';
  if current_count >= 5 then
    raise exception 'JOYHEART_PROFILE_PHOTO_LIMIT_REACHED' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger profile_photos_limit_before_insert
before insert on public.profile_photos
for each row execute function public.joyheart_enforce_profile_photo_limit();

create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','admin')),
  is_active boolean not null default true
);
alter table public.staff_roles enable row level security;
alter table public.staff_roles force row level security;

create table public.profile_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id),
  blocked_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint profile_blocks_no_self check (blocker_id <> blocked_id),
  constraint profile_blocks_pair_unique unique (blocker_id, blocked_id)
);
create table public.profile_matches (
  id uuid primary key default gen_random_uuid(),
  member_low uuid not null references auth.users(id),
  member_high uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active', 'unmatched', 'blocked')),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint profile_matches_ordered_pair check (member_low < member_high),
  constraint profile_matches_pair_unique unique (member_low, member_high)
);
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(p_name text)
returns text[] language sql immutable as $$
  select string_to_array(p_name, '/');
$$;
grant execute on function storage.foldername(text) to public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('joyheart-profile-photos', 'joyheart-profile-photos', true, 10485760, array['image/jpeg','image/png','image/webp']);

create or replace function public.joyheart_is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.is_active and sr.role in ('moderator','admin')
  );
$$;
alter function public.joyheart_is_active_staff() owner to postgres;
grant execute on function public.joyheart_is_active_staff() to authenticated;

create or replace function private.joyheart_is_match_eligible(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.user_id = u.id
    join public.profile_private pp on pp.user_id = u.id
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= pg_catalog.now())
      and pp.date_of_birth <= (current_date - interval '18 years')::date
      and pp.date_of_birth > (current_date - interval '121 years')::date
      and p.publication_status = 'published'
      and exists (
        select 1 from public.profile_photos ph
        where ph.user_id = u.id and ph.moderation_status = 'approved'
      )
  );
$$;
alter function private.joyheart_is_match_eligible(uuid) owner to postgres;

-- The real project has a global discovery feature flag that remains OFF.
-- Mirror that state here; the active-match path is tested separately below.
create or replace function private.joyheart_can_discover_pair(p_viewer_id uuid, p_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select false;
$$;
alter function private.joyheart_can_discover_pair(uuid,uuid) owner to postgres;

grant select, insert, update, delete on public.profile_photos to authenticated;
grant all on public.profile_photos to service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant all on storage.objects to service_role;
grant all on public.profiles to service_role;
grant all on public.staff_roles to service_role;
grant all on public.profile_blocks to service_role;
grant all on public.profile_matches to service_role;

-- Reproduce the legacy production policy from the prior staff-hardening migration.
-- Round 5B must explicitly remove it because permissive RLS policies OR together.
create policy profile_photos_owner_or_staff_read on public.profile_photos
  for select to authenticated using (
    user_id = (select auth.uid())
    or (public.joyheart_is_active_staff() and user_id <> (select auth.uid()))
  );
create policy profile_photos_owner_insert_pending on public.profile_photos
  for insert to authenticated with check (user_id = (select auth.uid()) and moderation_status = 'pending');
create policy profile_photos_owner_delete on public.profile_photos
  for delete to authenticated using (user_id = (select auth.uid()));

create policy joyheart_photo_owner_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy joyheart_photo_owner_read on storage.objects
  for select to authenticated using (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy joyheart_photo_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy joyheart_photo_staff_review_read on storage.objects
  for select to authenticated using (
    bucket_id = 'joyheart-profile-photos'
    and public.joyheart_is_active_staff()
    and (storage.foldername(name))[1] <> (select auth.uid())::text
  );
