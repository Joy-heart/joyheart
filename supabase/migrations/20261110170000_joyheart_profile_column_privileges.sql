-- JOYHEART ROUND 3: column-scoped profile read and write privileges.
-- REVIEW ONLY: do not apply to production without explicit approval.
-- Existing row-level policies and triggers are preserved.

begin;

-- Remove broad table-level read and write grants from ordinary members.
revoke select, update on table public.profiles from public, anon, authenticated;

-- Trigger functions are not client APIs. Keep their execution privilege private.
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

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
