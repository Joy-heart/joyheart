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

-- Exercise reciprocal eligibility with two synthetic members. All writes are
-- rolled back; these identities never exist in the production project.
begin;
insert into auth.users(id,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000001',now()),
 ('00000000-0000-0000-0000-000000000002',now());
insert into public.profile_private(user_id,date_of_birth) values
 ('00000000-0000-0000-0000-000000000001','1996-01-01'),
 ('00000000-0000-0000-0000-000000000002','1995-01-01');
insert into public.profiles(user_id,display_name,age,country,city,bio,interests,relationship_intention,seeking,gender,publication_status) values
 ('00000000-0000-0000-0000-000000000001','Member One',30,'Kenya','Kisumu','Enjoys nature',array['Reading','Travel'],'Long-term relationship','Everyone','Man','published'),
 ('00000000-0000-0000-0000-000000000002','Member Two',31,'Kenya','Nairobi','Enjoys travel',array['Travel','Reading'],'Long-term relationship','Everyone','Woman','published');
insert into public.profile_photos(user_id,moderation_status) values
 ('00000000-0000-0000-0000-000000000001','approved'),
 ('00000000-0000-0000-0000-000000000002','approved');
insert into public.member_discovery_preferences(user_id,preferred_age_min,preferred_age_max,discovery_enabled,relationship_intentions) values
 ('00000000-0000-0000-0000-000000000001',25,40,true,array['Long-term relationship']),
 ('00000000-0000-0000-0000-000000000002',25,40,true,array['Long-term relationship']);
update private.joyheart_feature_flags set enabled=true where flag_key='member_discovery';

do $$
begin
 if not private.joyheart_can_discover_pair('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002') then
  raise exception 'Two eligible, mutually opted-in members with compatible preferences should be eligible';
 end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 if (select count(*) from public.joyheart_discover_candidates(20))<>1 then
  raise exception 'Eligible member should receive the other eligible member';
 end if;
 update public.member_discovery_preferences set discovery_enabled=false where user_id='00000000-0000-0000-0000-000000000002';
 if private.joyheart_can_discover_pair('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002') then
  raise exception 'A member who opts out must not be discoverable';
 end if;
 update public.member_discovery_preferences set discovery_enabled=true where user_id='00000000-0000-0000-0000-000000000002';
 insert into public.profile_blocks(blocker_id,blocked_id) values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');
 if private.joyheart_can_discover_pair('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002') then
  raise exception 'A block in either direction must exclude the pair';
 end if;
 delete from public.profile_blocks where blocker_id='00000000-0000-0000-0000-000000000002' and blocked_id='00000000-0000-0000-0000-000000000001';
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 perform * from public.joyheart_record_interaction('00000000-0000-0000-0000-000000000002','like');
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 perform * from public.joyheart_record_interaction('00000000-0000-0000-0000-000000000001','like');
 if (select count(*) from public.profile_matches where status='active')<>1 then
  raise exception 'Reciprocal likes should create exactly one active match';
 end if;
 if (select count(*) from public.conversations)<>1 then
  raise exception 'A new mutual match should create exactly one conversation';
 end if;
end;
$$;
rollback;
