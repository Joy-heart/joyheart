-- Assert old rollback guard made no database state change.
do $verify_no_state_change$
declare kind_name text; before_state jsonb; after_state jsonb;
begin
 for kind_name in select kind from round5a3_guard_snapshot.state order by kind loop
  select payload into before_state from round5a3_guard_snapshot.state where kind=kind_name;
  if kind_name='rpc' then
   select jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',p.proowner,
    'acl',p.proacl,'proconfig',p.proconfig,'security_definer',p.prosecdef)
   into after_state from pg_catalog.pg_proc p where p.oid='public.joyheart_get_own_profile_private_settings()'::regprocedure;
  elsif kind_name='matrix' then
   with cols as (select a.attname from pg_catalog.pg_attribute a where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped),
   roles(role_name) as (values('anon'),('authenticated'),('joyheart_profiles_legacy_access'))
   select jsonb_agg(jsonb_build_object('role',role_name,'column',attname,
    'select',has_column_privilege(role_name,'public.profiles',attname,'SELECT'),
    'update',has_column_privilege(role_name,'public.profiles',attname,'UPDATE')) order by role_name,attname)
   into after_state from roles cross join cols;
  elsif kind_name='public_acl' then
   select jsonb_agg(jsonb_build_object('column',a.attname,'select',
    exists(select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x where x.grantee=0 and x.privilege_type='SELECT')
    or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x where x.grantee=0 and x.privilege_type='SELECT'),
    'update',exists(select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x where x.grantee=0 and x.privilege_type='UPDATE')
    or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x where x.grantee=0 and x.privilege_type='UPDATE'))
    order by a.attname) into after_state
   from pg_catalog.pg_attribute a join pg_catalog.pg_class cl on cl.oid=a.attrelid
   where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped;
  elsif kind_name='rls' then
   select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'cmd',cmd,'using',qual,'with_check',with_check) order by policyname),'[]'::jsonb)
   into after_state from pg_catalog.pg_policies where schemaname='public' and tablename='profiles';
  elsif kind_name='triggers' then
   select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'function',p.proname,
    'definition',pg_get_triggerdef(t.oid)) order by t.tgname),'[]'::jsonb)
   into after_state from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid=t.tgfoid
   where t.tgrelid='public.profiles'::regclass and not t.tgisinternal;
  end if;
  if before_state is distinct from after_state then
   raise exception 'ROLLBACK_GUARD_CHANGED_DATABASE_STATE: %',kind_name;
  end if;
 end loop;
 if to_regprocedure('public.joyheart_get_own_profile_private_settings()') is null then
  raise exception 'ROLLBACK_GUARD_REMOVED_PRIVATE_RPC';
 end if;
end
$verify_no_state_change$;
drop schema round5a3_guard_snapshot cascade;
select 'OLD_ROLLBACK_GUARD_NO_STATE_CHANGE_PASS' as result;
