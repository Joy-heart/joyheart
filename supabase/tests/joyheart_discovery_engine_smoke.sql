-- Smoke assertions for 20261110100000_joyheart_private_discovery_ranking.sql.
do $$
begin
 if not exists(select 1 from private.joyheart_feature_flags where flag_key='member_discovery' and enabled=false) then
   raise exception 'Discovery must default to globally closed';
 end if;
 if private.joyheart_discovery_is_open() then raise exception 'Global discovery gate unexpectedly open'; end if;
 if has_function_privilege('authenticated','private.joyheart_discovery_is_open()','EXECUTE') then
   raise exception 'Members must not inspect the private global gate';
 end if;
 if not has_function_privilege('authenticated','public.joyheart_discover_candidates(integer)','EXECUTE') then
   raise exception 'Authenticated discovery RPC grant missing';
 end if;
 if has_function_privilege('anon','public.joyheart_discover_candidates(integer)','EXECUTE') then
   raise exception 'Anonymous discovery RPC must be denied';
 end if;
 if has_function_privilege('authenticated','private.joyheart_can_discover_pair(uuid,uuid)','EXECUTE') then
   raise exception 'Pair eligibility helper must remain private';
 end if;
 if not has_function_privilege('authenticated','private.joyheart_record_interaction(uuid,text)','EXECUTE') then
   raise exception 'Protected interaction implementation grant missing';
 end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 if exists(select 1 from public.joyheart_discover_candidates(20)) then
   raise exception 'Discovery RPC must return no candidates while global gate is closed';
 end if;
end;
$$;
