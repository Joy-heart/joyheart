-- Minimal PostgreSQL fixture for the JoyHeart discovery-engine migration smoke test.
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

create table public.profiles(
 user_id uuid primary key, display_name text not null, age smallint not null,
 country text not null, city text, bio text, interests text[] not null default '{}',
 relationship_intention text not null, seeking text not null, gender text not null,
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
grant select on public.profiles,public.member_discovery_preferences,public.member_personality_answers,
 public.profile_blocks,public.profile_interactions,public.profile_matches,public.profile_photos,public.profile_private to authenticated;
