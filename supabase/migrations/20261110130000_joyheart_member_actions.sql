-- JoyHeart member actions: safely remove an outgoing like without reopening matches.
create or replace function private.joyheart_remove_like(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_target_id is null or p_target_id = v_actor then raise exception 'Invalid target'; end if;
  if exists (
    select 1 from public.profile_matches m
    where m.member_low = least(v_actor,p_target_id)
      and m.member_high = greatest(v_actor,p_target_id)
  ) then
    raise exception 'This connection is already a match. Use Unmatch instead.';
  end if;
  delete from public.profile_interactions
  where actor_id = v_actor and target_id = p_target_id and action = 'like';
  if not found then raise exception 'There is no outgoing like to remove'; end if;
end;
$$;
alter function private.joyheart_remove_like(uuid) owner to postgres;
revoke all on function private.joyheart_remove_like(uuid) from public, anon;
grant execute on function private.joyheart_remove_like(uuid) to authenticated;

create or replace function public.joyheart_remove_like(p_target_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.joyheart_remove_like(p_target_id); $$;
revoke all on function public.joyheart_remove_like(uuid) from public, anon;
grant execute on function public.joyheart_remove_like(uuid) to authenticated;
