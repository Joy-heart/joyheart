-- JOYHEART ROUND 2: rollback for 20261110170000_joyheart_profile_column_privileges.sql.
-- REVIEW ONLY. Run manually only if the approved migration is applied and must be reversed.
-- Restores the prior table-level SELECT grant. Does not alter RLS policies.

begin;
revoke select (
  user_id, display_name, age, country, city, relationship_intention,
  interests, bio, created_at, updated_at
) on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
revoke all on function public.joyheart_get_own_profile_private_settings() from public, anon, authenticated;
drop function if exists public.joyheart_get_own_profile_private_settings();
commit;
