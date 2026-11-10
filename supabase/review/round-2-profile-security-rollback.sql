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
grant select (
  user_id, display_name, age, country, city,
  relationship_intention, interests, bio, created_at, updated_at
) on table public.profiles to authenticated;
grant update (
  display_name, country, city, bio, gender, seeking,
  relationship_intention, interests, explore_interests
) on table public.profiles to authenticated;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

commit;
