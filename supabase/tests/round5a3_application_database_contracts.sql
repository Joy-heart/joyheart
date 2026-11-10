-- Round 5A.3 targeted database integration contracts for application flows.
-- Uses only synthetic users in the isolated PostgreSQL 17 CI fixture.
begin;
insert into auth.users(id,email_confirmed_at) values
 ('20000000-0000-4000-8000-000000000001',now()),
 ('20000000-0000-4000-8000-000000000002',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);

-- Profile Setup / creation contract: a member can create only their own private draft.
insert into public.profiles(
 user_id,display_name,age,country,city,bio,interests,relationship_intention,
 seeking,gender,explore_interests,is_visible,publication_status
) values (
 auth.uid(),'Integration Member A',30,'KE','Kisumu','Synthetic integration bio',
 array['Reading','Travel'],'Long-term relationship','Everyone','Man',
 array['Nature','Culture'],false,'draft'
);
do $profile_create$
declare row_count integer;
begin
 select count(*) into row_count from public.profiles where user_id=auth.uid() and publication_status='draft' and is_visible=false;
 if row_count<>1 then raise exception 'PROFILE_CREATE_CONTRACT_FAILED'; end if;
end
$profile_create$;

-- Account private-settings contract: owner-only RPC returns matching/editor settings.
do $account_private_settings$
declare s record;
begin
 select * into s from public.joyheart_get_own_profile_private_settings();
 if s.gender<>'Man' or s.seeking<>'Everyone' or s.publication_status<>'draft'
    or s.explore_interests<>array['Nature','Culture']::text[] then
  raise exception 'ACCOUNT_PRIVATE_SETTINGS_CONTRACT_FAILED';
 end if;
end
$account_private_settings$;

-- Explore contract: private Explore interests come from the same owner RPC,
-- while public relationship intention remains directly selectable.
do $explore_contract$
declare s record; intention text;
begin
 select * into s from public.joyheart_get_own_profile_private_settings();
 select relationship_intention into intention from public.profiles where user_id=auth.uid();
 if s.explore_interests<>array['Nature','Culture']::text[] or intention<>'Long-term relationship' then
  raise exception 'EXPLORE_DATA_CONTRACT_FAILED';
 end if;
end
$explore_contract$;

-- Profile editing contract: allowed public fields update and timestamp changes.
update public.profiles set display_name='Integration Member A Updated',bio='Edited synthetic bio'
where user_id=auth.uid();
do $profile_edit$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid()
   and display_name='Integration Member A Updated' and bio='Edited synthetic bio'
   and updated_at is not null) then raise exception 'PROFILE_EDIT_CONTRACT_FAILED'; end if;
end
$profile_edit$;

-- Discovery / matching RPC contract: globally closed discovery returns no candidate.
do $discovery_contract$
begin
 if exists(select 1 from public.joyheart_discover_candidates(20)) then
  raise exception 'DISCOVERY_GLOBAL_CLOSED_CONTRACT_FAILED';
 end if;
end
$discovery_contract$;
reset role;
rollback;
select 'ROUND5A3_APPLICATION_DATABASE_CONTRACTS_PASS' as result;
