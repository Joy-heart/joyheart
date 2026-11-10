-- Minimal PostgreSQL fixture for JoyHeart discovery and profile privacy tests.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
grant usage on schema auth,private to authenticated;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant execute on function auth.uid() to anon,authenticated;
create role joyheart_profiles_legacy_access nologin;
grant joyheart_profiles_legacy_access to authenticated with inherit true, set false;

create table public.profiles(
 user_id uuid primary key, display_name text not null, age smallint not null,
 country text not null, city text, bio text, interests text[] not null default '{}',
 relationship_intention text not null, seeking text not null, gender text not null,
 explore_interests text[] not null default '{}', is_visible boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 publication_status text not null
);
create table public.profile_private(user_id uuid primary key,date_of_birth date not null);
create table public.profile_photos(user_id uuid not null,moderation_status text not null);
create table public.member_discovery_preferences(
 user_id uuid primary key, preferred_age_min smallint not null, preferred_age_max smallint not null,
 preferred_countries text[] not null default '{}', preferred_languages text[] not null default '{}',
 relationship_intentions text[] not null default '{}', discovery_enabled boolean not null default false
);
create table public.member_personality_answers(user_id uuid primary key,answers jsonb not null default '{}');
create table public.profile_interactions(id uuid primary key default gen_random_uuid(),actor_id uuid not null,target_id uuid not null,action text not null,updated_at timestamptz default now(),unique(actor_id,target_id));
create table public.profile_blocks(blocker_id uuid not null,blocked_id uuid not null,unique(blocker_id,blocked_id));
create table public.profile_matches(id uuid primary key default gen_random_uuid(),member_low uuid not null,member_high uuid not null,status text not null default 'active',unique(member_low,member_high));
create table public.conversations(id uuid primary key default gen_random_uuid(),match_id uuid not null unique);

create function private.joyheart_is_match_eligible(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $fixture$
 select exists(
  select 1 from auth.users u join public.profiles p on p.user_id=u.id
  join public.profile_private pp on pp.user_id=u.id
  where u.id=p_user_id and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now())
   and pp.date_of_birth<=(current_date-interval '18 years')::date
   and pp.date_of_birth>(current_date-interval '121 years')::date
   and p.publication_status='published'
   and exists(select 1 from public.profile_photos ph where ph.user_id=u.id and ph.moderation_status='approved')
 )
$fixture$;
create function private.joyheart_preference_accepts(p_seeking text,p_gender text) returns boolean
language sql immutable security definer set search_path='' as $fixture$
 select case lower(btrim(coalesce(p_seeking,'')))
  when 'everyone' then lower(btrim(coalesce(p_gender,''))) in ('man','woman','non-binary','prefer not to say')
  when 'men' then lower(btrim(coalesce(p_gender,'')))='man'
  when 'women' then lower(btrim(coalesce(p_gender,'')))='woman'
  else false end
$fixture$;
grant usage on schema public to anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select, update on public.profiles to public;
grant select, update on public.profiles to anon with grant option;
grant select, update on public.profiles to joyheart_profiles_legacy_access with grant option;
grant select (gender,seeking,publication_status,is_visible), update (publication_status,is_visible) on public.profiles to joyheart_profiles_legacy_access with grant option;
grant select on public.member_discovery_preferences,public.member_personality_answers,
 public.profile_blocks,public.profile_interactions,public.profile_matches,public.profile_photos,public.profile_private to authenticated;

alter table public.profiles enable row level security;
create policy profiles_read_owner_or_published on public.profiles
 for select to authenticated using (user_id=auth.uid() or publication_status='published');
create policy profiles_insert_own_draft on public.profiles
 for insert to authenticated with check (user_id=auth.uid() and publication_status='draft' and is_visible=false);
create policy profiles_update_own on public.profiles
 for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Mirror the production guard trigger: owners cannot promote or publish profiles.
create function public.joyheart_guard_profile_write() returns trigger
language plpgsql set search_path='' as $guard$
begin
 if current_user='authenticated' then
  if tg_op='INSERT' then
   if new.user_id is distinct from auth.uid()
      or new.publication_status <> 'draft'
      or new.is_visible is distinct from false then
    raise exception 'JOYHEART_PROFILE_MUST_START_AS_PRIVATE_DRAFT' using errcode='42501';
   end if;
  elsif tg_op='UPDATE' then
   if new.user_id is distinct from old.user_id then
    raise exception 'JOYHEART_PROFILE_OWNER_CANNOT_CHANGE' using errcode='42501';
   end if;
   if new.publication_status is distinct from old.publication_status
      or new.is_visible is distinct from old.is_visible then
    raise exception 'JOYHEART_PROFILE_PUBLICATION_STAFF_ONLY' using errcode='42501';
   end if;
  end if;
 end if;
 new.is_visible := (new.publication_status='published');
 return new;
end;
$guard$;
create trigger joyheart_profiles_guard_write before insert or update on public.profiles
for each row execute function public.joyheart_guard_profile_write();

-- Mirror the production updated_at trigger. The profile privilege migration
-- revokes direct EXECUTE, but PostgreSQL trigger invocation must still work.
create function public.set_profile_updated_at() returns trigger
language plpgsql set search_path='' as $timestamp$
begin
 new.updated_at := pg_catalog.now();
 return new;
end;
$timestamp$;
grant execute on function public.set_profile_updated_at() to public, authenticated;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_profile_updated_at();

alter table public.profile_private enable row level security;
create policy profile_private_deny_all on public.profile_private
 for all to authenticated using (false) with check (false);
alter table public.member_discovery_preferences enable row level security;
create policy member_preferences_owner_all on public.member_discovery_preferences
 for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table public.member_personality_answers enable row level security;
create policy member_personality_owner_all on public.member_personality_answers
 for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
