-- Capture the exact pre-guard state in an isolated CI database.
create schema round5a3_guard_snapshot;
create table round5a3_guard_snapshot.state(kind text primary key,payload jsonb not null);
insert into round5a3_guard_snapshot.state values
('rpc',(
 select jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',p.proowner,
  'acl',p.proacl,'proconfig',p.proconfig,'security_definer',p.prosecdef)
 from pg_catalog.pg_proc p where p.oid='public.joyheart_get_own_profile_private_settings()'::regprocedure
)),
('matrix',(
 with cols as (select a.attname from pg_catalog.pg_attribute a where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped),
 roles(role_name) as (values('anon'),('authenticated'),('joyheart_profiles_legacy_access'))
 select jsonb_agg(jsonb_build_object('role',role_name,'column',attname,
  'select',has_column_privilege(role_name,'public.profiles',attname,'SELECT'),
  'update',has_column_privilege(role_name,'public.profiles',attname,'UPDATE'))
  order by role_name,attname)
 from roles cross join cols
)),
('public_acl',(
 select jsonb_agg(jsonb_build_object('column',a.attname,'select',exists(
  select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x where x.grantee=0 and x.privilege_type='SELECT')
  or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x where x.grantee=0 and x.privilege_type='SELECT'),
 'update',exists(select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x where x.grantee=0 and x.privilege_type='UPDATE')
  or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x where x.grantee=0 and x.privilege_type='UPDATE'))
  order by a.attname)
 from pg_catalog.pg_attribute a join pg_catalog.pg_class cl on cl.oid=a.attrelid
 where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped
)),
('rls',(
 select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'cmd',cmd,'using',qual,'with_check',with_check) order by policyname),'[]'::jsonb)
 from pg_catalog.pg_policies where schemaname='public' and tablename='profiles'
)),
('triggers',(
 select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'function',p.proname,
  'definition',pg_get_triggerdef(t.oid)) order by t.tgname),'[]'::jsonb)
 from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid=t.tgfoid
 where t.tgrelid='public.profiles'::regclass and not t.tgisinternal
));
select 'ROLLBACK_GUARD_PRESTATE_CAPTURED' as result;
