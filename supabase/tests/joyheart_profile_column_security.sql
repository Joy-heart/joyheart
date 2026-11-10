-- Synthetic two-member profile security tests. Isolated CI database only.
begin;
insert into auth.users(id,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001',now()),
 ('10000000-0000-4000-8000-000000000002',now());
insert into public.profile_private(user_id,date_of_birth) values
 ('10000000-0000-4000-8000-000000000001','1994-01-01'),
 ('10000000-0000-4000-8000-000000000002','1992-01-01');
insert into public.profiles(
 user_id,display_name,age,country,city,bio,interests,relationship_intention,
 seeking,gender,explore_interests,is_visible,publication_status
) values
 ('10000000-0000-4000-8000-000000000001','Synthetic A',32,'KE','Kisumu','A public bio',array['Reading'],'Long-term relationship','Women','Man',array['Nature'],false,'draft'),
 ('10000000-0000-4000-8000-000000000002','Synthetic B',34,'GB','London','Another public bio',array['Travel'],'Marriage-minded','Everyone','Woman',array['Music'],true,'published');
insert into public.member_discovery_preferences(user_id,preferred_age_min,preferred_age_max)
values ('10000000-0000-4000-8000-000000000001',20,40),('10000000-0000-4000-8000-000000000002',25,50);
insert into public.member_personality_answers(user_id,answers)
values ('10000000-0000-4000-8000-000000000001','{"values":"Trust and honesty"}'),
       ('10000000-0000-4000-8000-000000000002','{"values":"Kindness and respect"}');

do $$
begin
 if has_table_privilege('authenticated','public.profiles','SELECT')
    or has_table_privilege('authenticated','public.profiles','UPDATE') then
   raise exception 'Broad table-level SELECT/UPDATE must be revoked';
 end if;
 if has_column_privilege('authenticated','public.profiles','gender','SELECT')
    or has_column_privilege('authenticated','public.profiles','publication_status','SELECT')
    or has_column_privilege('authenticated','public.profiles','is_visible','SELECT') then
   raise exception 'Restricted columns remain directly readable';
 end if;
 if has_column_privilege('authenticated','public.profiles','publication_status','UPDATE')
    or has_column_privilege('authenticated','public.profiles','is_visible','UPDATE')
    or has_column_privilege('authenticated','public.profiles','age','UPDATE')
    or has_column_privilege('authenticated','public.profiles','user_id','UPDATE') then
   raise exception 'Protected columns remain directly updateable';
 end if;
 if not has_column_privilege('authenticated','public.profiles','display_name','SELECT')
    or not has_column_privilege('authenticated','public.profiles','display_name','UPDATE')
    or not has_column_privilege('authenticated','public.profiles','gender','UPDATE') then
   raise exception 'Legitimate presentation/profile editing grants are missing';
 end if;
 if has_function_privilege('anon','public.joyheart_get_own_profile_private_settings()','EXECUTE') then
   raise exception 'Anonymous users must not call the private profile RPC';
 end if;
end $$;

-- Assert no stale column-level grants survive on any profile column.
do $column_grant_audit$
declare
  column_name text;
  allowed_select text[] := array[
    'user_id','display_name','age','country','city',
    'relationship_intention','interests','bio','created_at','updated_at'
  ];
  allowed_update text[] := array[
    'display_name','country','city','bio','gender','seeking',
    'relationship_intention','interests','explore_interests'
  ];
begin
  for column_name in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
  loop
    if has_column_privilege('anon','public.profiles',column_name,'SELECT')
       or has_column_privilege('anon','public.profiles',column_name,'UPDATE') then
      raise exception 'Anonymous role retains a profile column privilege: %', column_name;
    end if;
    if has_column_privilege('authenticated','public.profiles',column_name,'SELECT')
       and not (column_name = any(allowed_select)) then
      raise exception 'Unexpected authenticated SELECT privilege on profiles.%', column_name;
    end if;
    if has_column_privilege('authenticated','public.profiles',column_name,'UPDATE')
       and not (column_name = any(allowed_update)) then
      raise exception 'Unexpected authenticated UPDATE privilege on profiles.%', column_name;
    end if;
  end loop;
end
$column_grant_audit$;

-- Member A: private RPC is owner-scoped; public profile rows obey published/owner RLS.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare s record; n integer;
begin
 select * into s from public.joyheart_get_own_profile_private_settings();
 if s.gender<>'Man' or s.seeking<>'Women' or s.publication_status<>'draft' then
  raise exception 'Member A did not receive only their own private settings';
 end if;
 select count(*) into n from public.profiles;
 if n<>2 then raise exception 'Member A should see own draft and published B presentation'; end if;
 select count(*) into n from public.profile_private;
 if n<>0 then raise exception 'Member A can read DOB rows'; end if;
 select count(*) into n from public.member_discovery_preferences;
 if n<>1 then raise exception 'Member A can read another member preferences'; end if;
 select count(*) into n from public.member_personality_answers;
 if n<>1 then raise exception 'Member A can read another member personality answers'; end if;
 update public.profiles set display_name='Synthetic A Updated', bio='Edited by owner'
  where user_id=auth.uid();
 if not found then raise exception 'Member A legitimate profile edit failed'; end if;
 if has_function_privilege('authenticated','public.set_profile_updated_at()','EXECUTE') then
   raise exception 'Authenticated members retain direct timestamp-trigger EXECUTE';
 end if;
 if (select updated_at from public.profiles where user_id=auth.uid()) is null then
   raise exception 'Timestamp trigger failed after execute privilege revocation';
 end if;
 begin
  execute 'update public.profiles set publication_status=''published'' where user_id=auth.uid()';
  raise exception 'Member A unexpectedly updated publication_status';
 exception when insufficient_privilege then null;
 end;
 begin
  execute 'update public.profiles set is_visible=true where user_id=auth.uid()';
  raise exception 'Member A unexpectedly updated is_visible';
 exception when insufficient_privilege then null;
 end;
 begin
  execute 'select gender from public.profiles where user_id=auth.uid()';
  raise exception 'Member A unexpectedly selected gender directly';
 exception when insufficient_privilege then null;
 end;
end $$;

-- Member B: same isolation, cannot see A's draft or private records.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$
declare s record; n integer;
begin
 select * into s from public.joyheart_get_own_profile_private_settings();
 if s.gender<>'Woman' or s.seeking<>'Everyone' or s.publication_status<>'published' then
  raise exception 'Member B did not receive only their own private settings';
 end if;
 select count(*) into n from public.profiles;
 if n<>1 then raise exception 'Member B must not see A draft profile'; end if;
 select count(*) into n from public.profile_private;
 if n<>0 then raise exception 'Member B can read DOB rows'; end if;
 select count(*) into n from public.member_discovery_preferences;
 if n<>1 then raise exception 'Member B can read another member preferences'; end if;
 select count(*) into n from public.member_personality_answers;
 if n<>1 then raise exception 'Member B can read another member personality answers'; end if;
 update public.profiles set display_name='Synthetic B Updated'
  where user_id=auth.uid();
 if not found then raise exception 'Member B legitimate profile edit failed'; end if;
 begin
  execute 'update public.profiles set publication_status=''published'' where user_id=auth.uid()';
  raise exception 'Member B unexpectedly updated publication_status';
 exception when insufficient_privilege then null;
 end;
 begin
  execute 'update public.profiles set is_visible=false where user_id=auth.uid()';
  raise exception 'Member B unexpectedly updated is_visible';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

-- Anonymous callers cannot execute the private-settings RPC.
set local role anon;
do $$
begin
 begin
  perform public.joyheart_get_own_profile_private_settings();
  raise exception 'Anonymous RPC execution unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
