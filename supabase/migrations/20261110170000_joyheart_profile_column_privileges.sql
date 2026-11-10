-- JOYHEART ROUND 2: restrict direct profile reads to approved presentation columns.
-- REVIEW ONLY: this file is proposed and MUST NOT be applied to production without approval.
-- Existing row-level security policies are deliberately preserved unchanged.

begin;

-- A table-level SELECT grant exposes every column on every row admitted by RLS.
-- Remove only that broad SELECT grant; INSERT and UPDATE grants remain unchanged.
revoke select on table public.profiles from authenticated;

-- Members may directly read only the fields used for public profile presentation,
-- discovery cards, and active-match profile pages. RLS still controls which rows.
grant select (
  user_id,
  display_name,
  age,
  country,
  city,
  relationship_intention,
  interests,
  bio,
  created_at,
  updated_at
) on table public.profiles to authenticated;

-- Private profile editor data is returned only for the current authenticated owner.
-- This function does not accept a user id, so callers cannot ask for another member.
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
  'Returns private profile editor fields for auth.uid() only. Does not accept a target member id.';

commit;
