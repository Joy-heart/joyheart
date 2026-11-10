-- Synthetic profile-column security assertions. Run only against the isolated CI fixture.
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

do $$
begin
 if has_table_privilege('authenticated','public.profiles','SELECT') then
   raise exception 'Table-level SELECT must be revoked';
 end if;
 if has_column_privilege('authenticated','public.profiles','gender','SELECT')
    or has_column_privilege('authenticated','public.profiles','seeking','SELECT')
    or has_column_privilege('authenticated','public.profiles','explore_interests','SELECT')
    or has_column_privilege('authenticated','public.profiles','publication_status','SELECT')
    or has_column_privilege('authenticated','public.profiles','is_visible','SELECT') then
   raise exception 'Sensitive profile columns remain directly readable';
 end if;
 if not has_column_privilege('authenticated','public.profiles','display_name','SELECT')
    or not has_column_privilege('authenticated','public.profiles','bio','SELECT') then
   raise exception 'Approved presentation column grants are missing';
 end if;
 if has_function_privilege('anon','public.joyheart_get_own_profile_private_settings()','EXECUTE') then
   raise exception 'Anonymous users must not call the private profile RPC';
 end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

do $$
declare own_settings record; visible_count integer; private_dob_count integer;
begin
 select * into own_settings from public.joyheart_get_own_profile_private_settings();
 if own_settings.gender <> 'Man' or own_settings.seeking <> 'Women'
    or own_settings.publication_status <> 'draft' then
   raise exception 'Member A did not receive their own private profile settings';
 end if;
 select count(*) into visible_count from public.profiles;
 if visible_count <> 2 then
   raise exception 'Public presentation rows did not remain readable under existing RLS';
 end if;
 begin
   execute 'select gender from public.profiles limit 1';
   raise exception 'Direct gender query unexpectedly succeeded';
 exception when insufficient_privilege then
   null;
 end;
 select count(*) into private_dob_count from public.profile_private;
 if private_dob_count <> 0 then
   raise exception 'Member A can read another member private date of birth';
 end if;
end $$;

reset role;
rollback;
