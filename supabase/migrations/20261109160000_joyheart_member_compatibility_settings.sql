-- JoyHeart Milestone 4: private discovery preferences and personality answers.
-- These records are never exposed through public member profile queries.
create table if not exists public.member_discovery_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_age_min smallint not null default 18,
  preferred_age_max smallint not null default 99,
  preferred_countries text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  relationship_intentions text[] not null default '{}',
  discovery_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint member_preferences_age_range check (
    preferred_age_min >= 18 and preferred_age_max <= 120
    and preferred_age_min <= preferred_age_max
  ),
  constraint member_preferences_country_limit check (cardinality(preferred_countries) <= 30),
  constraint member_preferences_language_limit check (cardinality(preferred_languages) <= 20),
  constraint member_preferences_intentions_limit check (cardinality(relationship_intentions) <= 12)
);

create table if not exists public.member_personality_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint member_personality_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint member_personality_answers_size check (pg_column_size(answers) <= 16384)
);

alter table public.member_discovery_preferences enable row level security;
alter table public.member_discovery_preferences force row level security;
alter table public.member_personality_answers enable row level security;
alter table public.member_personality_answers force row level security;

drop policy if exists "member_preferences_owner_all" on public.member_discovery_preferences;
create policy "member_preferences_owner_all"
  on public.member_discovery_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "member_personality_owner_all" on public.member_personality_answers;
create policy "member_personality_owner_all"
  on public.member_personality_answers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.member_discovery_preferences, public.member_personality_answers from public, anon;
grant select, insert, update, delete on public.member_discovery_preferences, public.member_personality_answers to authenticated;

create or replace function public.joyheart_touch_member_profile_settings()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.joyheart_touch_member_profile_settings() from public, anon, authenticated;
drop trigger if exists member_discovery_preferences_touch on public.member_discovery_preferences;
create trigger member_discovery_preferences_touch before update on public.member_discovery_preferences
for each row execute function public.joyheart_touch_member_profile_settings();
drop trigger if exists member_personality_answers_touch on public.member_personality_answers;
create trigger member_personality_answers_touch before update on public.member_personality_answers
for each row execute function public.joyheart_touch_member_profile_settings();

comment on table public.member_discovery_preferences is
  'Private, owner-only discovery filters. Never include in public profile or discovery payloads.';
comment on table public.member_personality_answers is
  'Private, owner-only compatibility questionnaire answers. Share only selected derived prompts with explicit member consent.';
