-- Secure repeatable permission recovery; NOT an application rollback.
-- Preserves the owner-only RPC, existing RLS policies and triggers.
-- Reasserts restricted grants, clears direct stale grants and the JoyHeart-owned
-- legacy role grants. Unknown inherited access fails closed. Production use
-- requires separate explicit approval.
begin;
revoke select, update on public.profiles from public, anon, authenticated;
do $clear_columns$
declare column_name text;
begin
 for column_name in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
  execute format('revoke select (%1$I), update (%1$I) on public.profiles from public, anon, authenticated',column_name);
 end loop;
end
$clear_columns$;
do $clear_legacy$
declare column_name text;
begin
 if exists(select 1 from pg_catalog.pg_roles where rolname='joyheart_profiles_legacy_access') then
  revoke select, update on public.profiles from joyheart_profiles_legacy_access cascade;
  for column_name in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
   execute format('revoke select (%1$I), update (%1$I) on public.profiles from joyheart_profiles_legacy_access cascade',column_name);
  end loop;
 end if;
end
$clear_legacy$;
grant select (user_id,display_name,age,country,city,relationship_intention,interests,bio,created_at,updated_at) on public.profiles to authenticated;
grant update (display_name,country,city,bio,gender,seeking,relationship_intention,interests,explore_interests) on public.profiles to authenticated;
do $rpc_check$
begin
 if to_regprocedure('public.joyheart_get_own_profile_private_settings()') is null then raise exception 'PRIVATE_SETTINGS_RPC_MISSING'; end if;
 if not has_function_privilege('authenticated','public.joyheart_get_own_profile_private_settings()','EXECUTE') or has_function_privilege('anon','public.joyheart_get_own_profile_private_settings()','EXECUTE') then raise exception 'PRIVATE_SETTINGS_RPC_EXECUTE_INVALID'; end if;
 if to_regprocedure('public.set_profile_updated_at()') is not null then revoke all on function public.set_profile_updated_at() from public,anon,authenticated; end if;
end
$rpc_check$;
do $effective_check$
declare c record;
 s text[]:=array['user_id','display_name','age','country','city','relationship_intention','interests','bio','created_at','updated_at'];
 u text[]:=array['display_name','country','city','bio','gender','seeking','relationship_intention','interests','explore_interests'];
begin
 if has_table_privilege('anon','public.profiles','SELECT') or has_table_privilege('anon','public.profiles','UPDATE') or has_table_privilege('authenticated','public.profiles','SELECT') or has_table_privilege('authenticated','public.profiles','UPDATE') then raise exception 'TABLE_PRIVILEGE_REMAINS'; end if;
 for c in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
  if has_column_privilege('anon','public.profiles',c.column_name,'SELECT') or has_column_privilege('anon','public.profiles',c.column_name,'UPDATE') then raise exception 'ANON_COLUMN_PRIVILEGE: %',c.column_name; end if;
  if has_column_privilege('authenticated','public.profiles',c.column_name,'SELECT') and not(c.column_name=any(s)) then raise exception 'UNEXPECTED_SELECT: %',c.column_name; end if;
  if has_column_privilege('authenticated','public.profiles',c.column_name,'UPDATE') and not(c.column_name=any(u)) then raise exception 'UNEXPECTED_UPDATE: %',c.column_name; end if;
 end loop;
end
$effective_check$;
commit;
