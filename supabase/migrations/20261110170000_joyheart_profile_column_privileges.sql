-- JOYHEART ROUND 3: column-scoped profile read and write privileges.
-- REVIEW ONLY: do not apply to production without explicit approval.
-- Existing row-level policies and triggers are preserved.

begin;

-- Remove broad table-level read and write grants from ordinary members.
revoke select, update on table public.profiles from public, anon, authenticated;

-- Also clear any older column-level grants. Table-level REVOKE does not
-- remove independently granted column privileges, which may survive from
-- earlier migrations or default privilege changes.
do $revoke_profile_column_grants$
declare
  column_name text;
begin
  for column_name in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
  loop
    execute format(
      'revoke select (%1$I), update (%1$I) on table public.profiles from public, anon, authenticated',
      column_name
    );
  end loop;
end;
$revoke_profile_column_grants$;

-- Remove grants only from this JoyHeart-owned legacy role. Other inherited
-- access is not silently altered; effective privilege checks below fail closed.
do $revoke_joyheart_legacy$
declare column_name text;
begin
 if exists(select 1 from pg_catalog.pg_roles where rolname='joyheart_profiles_legacy_access') then
  revoke select, update on public.profiles from joyheart_profiles_legacy_access cascade;
  for column_name in select cols.column_name from information_schema.columns cols where cols.table_schema='public' and cols.table_name='profiles' loop
   execute format('revoke select (%1$I), update (%1$I) on public.profiles from joyheart_profiles_legacy_access cascade',column_name);
  end loop;
 end if;
end
$revoke_joyheart_legacy$;

-- Trigger functions are not client APIs. Keep their execution privilege private.
do $revoke_trigger_execute$
begin
  if to_regprocedure('public.set_profile_updated_at()') is not null then
    execute 'revoke all on function public.set_profile_updated_at() from public, anon, authenticated';
  end if;
end;
$revoke_trigger_execute$;

-- Direct reads are limited to approved profile presentation fields.
-- RLS continues to decide which rows are visible.
grant select (
  user_id, display_name, age, country, city,
  relationship_intention, interests, bio, created_at, updated_at
) on table public.profiles to authenticated;

-- Preserve legitimate owner editing, including private preference fields
-- written by the profile editor. Never grant UPDATE on user_id, age,
-- publication_status, is_visible, created_at, or updated_at.
grant update (
  display_name, country, city, bio, gender, seeking,
  relationship_intention, interests, explore_interests
) on table public.profiles to authenticated;

-- Detect any remaining effective access inherited through unrecognised roles.
do $effective_privilege_check$
declare c record;
 s text[]:=array['user_id','display_name','age','country','city','relationship_intention','interests','bio','created_at','updated_at'];
 u text[]:=array['display_name','country','city','bio','gender','seeking','relationship_intention','interests','explore_interests'];
begin
 if has_table_privilege('anon','public.profiles','SELECT') or has_table_privilege('anon','public.profiles','UPDATE')
 or has_table_privilege('authenticated','public.profiles','SELECT') or has_table_privilege('authenticated','public.profiles','UPDATE') then
  raise exception 'JOYHEART_PROFILE_TABLE_PRIVILEGE_REMAINS';
 end if;
 for c in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
  if has_column_privilege('anon','public.profiles',c.column_name,'SELECT') or has_column_privilege('anon','public.profiles',c.column_name,'UPDATE') then
   raise exception 'JOYHEART_ANON_COLUMN_PRIVILEGE_REMAINS: %',c.column_name;
  end if;
  if has_column_privilege('authenticated','public.profiles',c.column_name,'SELECT') and not(c.column_name=any(s)) then
   raise exception 'JOYHEART_UNEXPECTED_EFFECTIVE_SELECT: %',c.column_name;
  end if;
  if has_column_privilege('authenticated','public.profiles',c.column_name,'UPDATE') and not(c.column_name=any(u)) then
   raise exception 'JOYHEART_UNEXPECTED_EFFECTIVE_UPDATE: %',c.column_name;
  end if;
 end loop;
end
$effective_privilege_check$;

-- Private editor data is returned only for auth.uid(); there is no target ID.
create or replace function public.joyheart_get_own_profile_private_settings()
returns table (
  gender text,
  seeking text,
  explore_interests text[],
  publication_status text,
  is_visible boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.gender, p.seeking, p.explore_interests, p.publication_status, p.is_visible
  from public.profiles p
  where p.user_id = auth.uid()
    and auth.uid() is not null;
$function$;

alter function public.joyheart_get_own_profile_private_settings() owner to postgres;
revoke all on function public.joyheart_get_own_profile_private_settings() from public, anon;
grant execute on function public.joyheart_get_own_profile_private_settings() to authenticated;

comment on function public.joyheart_get_own_profile_private_settings() is
  'Returns private profile editor fields for auth.uid() only. No arbitrary member ID is accepted.';

commit;
