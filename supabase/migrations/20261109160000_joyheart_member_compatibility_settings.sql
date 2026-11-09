-- JoyHeart Milestone 4: private discovery preferences and personality answers.
-- These records are owner-readable only. Writes must go through the validated,
-- authenticated, atomic RPC below; clients cannot bypass its validation.

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

drop policy if exists member_preferences_owner_select on public.member_discovery_preferences;
create policy member_preferences_owner_select
  on public.member_discovery_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists member_personality_owner_select on public.member_personality_answers;
create policy member_personality_owner_select
  on public.member_personality_answers for select to authenticated
  using (user_id = (select auth.uid()));

-- No direct INSERT/UPDATE/DELETE: all writes pass through the RPC's validation.
revoke all on public.member_discovery_preferences, public.member_personality_answers from public, anon, authenticated;
grant select on public.member_discovery_preferences, public.member_personality_answers to authenticated;

create or replace function public.joyheart_touch_member_profile_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.joyheart_touch_member_profile_settings() from public, anon, authenticated;

drop trigger if exists member_discovery_preferences_touch on public.member_discovery_preferences;
create trigger member_discovery_preferences_touch
  before update on public.member_discovery_preferences
  for each row execute function public.joyheart_touch_member_profile_settings();

drop trigger if exists member_personality_answers_touch on public.member_personality_answers;
create trigger member_personality_answers_touch
  before update on public.member_personality_answers
  for each row execute function public.joyheart_touch_member_profile_settings();

-- SECURITY DEFINER is narrowly scoped: the target user is always auth.uid(),
-- no caller-supplied user ID is accepted, and the function has a fixed search_path.
-- Both rows are written in one transaction or neither is written.
create or replace function public.joyheart_save_member_compatibility_settings(
  p_preferences jsonb,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_min integer;
  v_max integer;
  v_item text;
  v_key text;
  v_value text;
  v_discovery_enabled boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(p_preferences) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Invalid compatibility settings' using errcode = '22023';
  end if;

  if not (p_preferences ?& array[
    'preferred_age_min', 'preferred_age_max', 'preferred_countries',
    'preferred_languages', 'relationship_intentions', 'discovery_enabled'
  ]) then
    raise exception 'Missing required preference fields' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(p_preferences -> 'preferred_age_min') <> 'number'
     or pg_catalog.jsonb_typeof(p_preferences -> 'preferred_age_max') <> 'number'
     or (p_preferences ->> 'preferred_age_min') !~ '^[0-9]{1,3}$'
     or (p_preferences ->> 'preferred_age_max') !~ '^[0-9]{1,3}$' then
    raise exception 'Age preferences must be whole numbers' using errcode = '22023';
  end if;

  v_min := (p_preferences ->> 'preferred_age_min')::integer;
  v_max := (p_preferences ->> 'preferred_age_max')::integer;
  if v_min < 18 or v_max > 120 or v_min > v_max then
    raise exception 'Choose a valid age range (18 to 120)' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(p_preferences -> 'preferred_countries') is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_preferences -> 'preferred_countries') > 30
     or pg_catalog.jsonb_typeof(p_preferences -> 'preferred_languages') is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_preferences -> 'preferred_languages') > 20
     or pg_catalog.jsonb_typeof(p_preferences -> 'relationship_intentions') is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_preferences -> 'relationship_intentions') > 12 then
    raise exception 'Invalid preference list' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(p_preferences -> 'discovery_enabled') is distinct from 'boolean' then
    raise exception 'Discovery visibility must be true or false' using errcode = '22023';
  end if;
  v_discovery_enabled := (p_preferences ->> 'discovery_enabled')::boolean;

  for v_item in
    select value from pg_catalog.jsonb_array_elements_text(p_preferences -> 'preferred_countries')
    union all
    select value from pg_catalog.jsonb_array_elements_text(p_preferences -> 'preferred_languages')
  loop
    if v_item is null or pg_catalog.length(v_item) = 0
       or pg_catalog.length(v_item) > 80
       or v_item <> pg_catalog.btrim(v_item) then
      raise exception 'Country and language entries must be 1 to 80 trimmed characters' using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_preferences -> 'preferred_countries') e
    where pg_catalog.jsonb_typeof(e) <> 'string'
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_preferences -> 'preferred_languages') e
    where pg_catalog.jsonb_typeof(e) <> 'string'
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_preferences -> 'relationship_intentions') e
    where pg_catalog.jsonb_typeof(e) <> 'string'
  ) then
    raise exception 'Preference lists must contain text values only' using errcode = '22023';
  end if;

  for v_item in
    select value from pg_catalog.jsonb_array_elements_text(p_preferences -> 'relationship_intentions')
  loop
    if v_item not in (
      'Long-term relationship', 'Serious relationship', 'Marriage-minded',
      'Life partner', 'Friendship first', 'Casual dating'
    ) then
      raise exception 'Invalid relationship intention' using errcode = '22023';
    end if;
  end loop;

  if pg_catalog.jsonb_object_length(p_answers) > 6 then
    raise exception 'Too many personality answers' using errcode = '22023';
  end if;

  for v_key, v_value in
    select key, value #>> '{}'
    from pg_catalog.jsonb_each(p_answers)
  loop
    if v_key not in ('communication', 'weekend', 'conflict', 'values', 'affection', 'pace')
       or pg_catalog.jsonb_typeof(p_answers -> v_key) <> 'string'
       or v_value is null then
      raise exception 'Invalid personality answer' using errcode = '22023';
    end if;

    if not (
      (v_key = 'communication' and v_value in ('A thoughtful conversation', 'A little message throughout the day', 'Phone or video calls', 'A balance of all three'))
      or (v_key = 'weekend' and v_value in ('Quiet time and recharging', 'Exploring somewhere new', 'Friends, family and social time', 'Outdoor activities and adventure'))
      or (v_key = 'conflict' and v_value in ('Talk it through calmly', 'Take a little time, then talk', 'Write down how I feel', 'Listen first and understand each other'))
      or (v_key = 'values' and v_value in ('Trust and honesty', 'Kindness and respect', 'Shared goals and commitment', 'Humour and friendship'))
      or (v_key = 'affection' and v_value in ('Words and encouragement', 'Time and attention', 'Helpful actions', 'Thoughtful gestures and touch'))
      or (v_key = 'pace' and v_value in ('Slow and intentional', 'Steady with regular communication', 'Open to seeing how it develops'))
    ) then
      raise exception 'Invalid personality answer' using errcode = '22023';
    end if;
  end loop;

  insert into public.member_discovery_preferences (
    user_id, preferred_age_min, preferred_age_max, preferred_countries,
    preferred_languages, relationship_intentions, discovery_enabled
  ) values (
    v_user_id, v_min, v_max,
    array(select pg_catalog.jsonb_array_elements_text(p_preferences -> 'preferred_countries')),
    array(select pg_catalog.jsonb_array_elements_text(p_preferences -> 'preferred_languages')),
    array(select pg_catalog.jsonb_array_elements_text(p_preferences -> 'relationship_intentions')),
    v_discovery_enabled
  )
  on conflict (user_id) do update set
    preferred_age_min = excluded.preferred_age_min,
    preferred_age_max = excluded.preferred_age_max,
    preferred_countries = excluded.preferred_countries,
    preferred_languages = excluded.preferred_languages,
    relationship_intentions = excluded.relationship_intentions,
    discovery_enabled = excluded.discovery_enabled;

  insert into public.member_personality_answers (user_id, answers)
  values (v_user_id, p_answers)
  on conflict (user_id) do update set answers = excluded.answers;
end;
$$;

revoke all on function public.joyheart_save_member_compatibility_settings(jsonb, jsonb) from public, anon;
grant execute on function public.joyheart_save_member_compatibility_settings(jsonb, jsonb) to authenticated;

comment on table public.member_discovery_preferences is
  'Private, owner-readable discovery filters. Never include in public profile or discovery payloads.';
comment on table public.member_personality_answers is
  'Private, owner-readable compatibility questionnaire answers. Share only selected derived prompts with explicit member consent.';
