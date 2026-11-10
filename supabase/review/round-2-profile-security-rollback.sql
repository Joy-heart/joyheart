-- JOYHEART ROUND 3: safe recovery for the profile privilege migration.
-- IMPORTANT: Never restore table-level SELECT/UPDATE; that would re-expose private columns.
-- Application rollback order: first deploy the prior application version that no longer
-- calls joyheart_get_own_profile_private_settings(), then run this SQL if the RPC must go.
-- This recovery intentionally leaves safe presentation-column SELECT and editable-column
-- UPDATE grants in place. It does not restore broad table privileges.

begin;

revoke all on function public.joyheart_get_own_profile_private_settings() from public, anon, authenticated;
drop function if exists public.joyheart_get_own_profile_private_settings();

-- Reassert the least-privilege grants instead of restoring broad table grants.
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
grant select (
  user_id, display_name, age, country, city,
  relationship_intention, interests, bio, created_at, updated_at
) on table public.profiles to authenticated;
grant update (
  display_name, country, city, bio, gender, seeking,
  relationship_intention, interests, explore_interests
) on table public.profiles to authenticated;

do $revoke_trigger_execute$
begin
  if to_regprocedure('public.set_profile_updated_at()') is not null then
    execute 'revoke all on function public.set_profile_updated_at() from public, anon, authenticated';
  end if;
end;
$revoke_trigger_execute$;

commit;
