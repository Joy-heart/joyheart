-- Round 5A.3: machine-readable, synthetic-only profile security evidence.
-- Usage: psql -X -v ON_ERROR_STOP=1 -v commit_sha="$GITHUB_SHA" -At -f this-file
with profile_columns as (
 select a.attname as column_name, a.attnum
 from pg_catalog.pg_attribute a
 where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped
), role_names(role_name) as (
 values ('anon'),('authenticated'),('joyheart_profiles_legacy_access')
), role_matrix as (
 select r.role_name,c.column_name,
        has_column_privilege(r.role_name,'public.profiles',c.column_name,'SELECT') as can_select,
        has_column_privilege(r.role_name,'public.profiles',c.column_name,'UPDATE') as can_update,
        c.attnum
 from role_names r cross join profile_columns c
), public_matrix as (
 select 'PUBLIC'::text as role_name,c.column_name,
        (
          exists(select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x
                 where x.grantee=0 and x.privilege_type='SELECT')
          or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x
                    where x.grantee=0 and x.privilege_type='SELECT')
        ) as can_select,
        (
          exists(select 1 from aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) x
                 where x.grantee=0 and x.privilege_type='UPDATE')
          or exists(select 1 from aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x
                    where x.grantee=0 and x.privilege_type='UPDATE')
        ) as can_update,c.attnum
 from profile_columns c
 join pg_catalog.pg_attribute a on a.attrelid='public.profiles'::regclass and a.attname=c.column_name and a.attnum=c.attnum
 join pg_catalog.pg_class cl on cl.oid='public.profiles'::regclass
), matrix as (
 select * from role_matrix union all select * from public_matrix
), rpc as (
 select jsonb_build_object(
  'schema',n.nspname,'name',p.proname,'identity_arguments',pg_get_function_identity_arguments(p.oid),
  'owner',p.proowner::regrole::text,'security_definer',p.prosecdef,'configuration',p.proconfig,
  'definition',pg_get_functiondef(p.oid),
  'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
  'acl',coalesce(p.proacl::text[],'{}'::text[])
 ) as value
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where p.oid='public.joyheart_get_own_profile_private_settings()'::regprocedure
), policies as (
 select coalesce(jsonb_agg(jsonb_build_object(
  'policy_name',policyname,'roles',roles,'command',cmd,'using',qual,'with_check',with_check
 ) order by policyname),'[]'::jsonb) as value
 from pg_catalog.pg_policies where schemaname='public' and tablename='profiles'
), triggers as (
 select coalesce(jsonb_agg(jsonb_build_object(
  'trigger_name',t.tgname,'enabled',t.tgenabled,'function',p.proname,
  'function_owner',p.proowner::regrole::text,
  'authenticated_direct_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'definition',pg_get_triggerdef(t.oid)
 ) order by t.tgname),'[]'::jsonb) as value
 from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid=t.tgfoid
 where t.tgrelid='public.profiles'::regclass and not t.tgisinternal
)
select jsonb_pretty(jsonb_build_object(
 'commit_sha',:'commit_sha',
 'generated_at_utc',to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
 'database_version',version(),
 'profile_table','public.profiles',
 'permission_matrix',(select jsonb_agg(jsonb_build_object(
  'role',role_name,'column',column_name,'select',can_select,'update',can_update
 ) order by role_name,column_name) from matrix),
 'rpc',(select value from rpc),
 'rls_policies',(select value from policies),
 'timestamp_triggers',(select value from triggers)
));
