-- Assert the synthetic fixture really contains each intended legacy risk.
-- Runs before migration in an isolated PostgreSQL 17 database only.
do $legacy_acl_preflight$
begin
 if not has_table_privilege('anon','public.profiles','SELECT')
    or not has_table_privilege('anon','public.profiles','UPDATE') then
  raise exception 'Fixture missing anon table-level legacy grants';
 end if;
 if not has_table_privilege('authenticated','public.profiles','SELECT')
    or not has_table_privilege('authenticated','public.profiles','UPDATE') then
  raise exception 'Fixture missing inherited authenticated table-level grants';
 end if;
 if not has_column_privilege('authenticated','public.profiles','gender','SELECT')
    or not has_column_privilege('authenticated','public.profiles','publication_status','UPDATE') then
  raise exception 'Fixture missing inherited column-level legacy grants';
 end if;
 if not exists(
   select 1 from pg_catalog.pg_auth_members m
   join pg_catalog.pg_roles parent on parent.oid=m.roleid
   join pg_catalog.pg_roles member on member.oid=m.member
   where parent.rolname='joyheart_profiles_legacy_access'
     and member.rolname='authenticated'
 ) then raise exception 'Fixture missing inherited role membership'; end if;
 if not exists(
   select 1 from information_schema.role_table_grants
   where table_schema='public' and table_name='profiles'
     and grantee='anon' and privilege_type='SELECT'
 ) then raise exception 'Fixture missing information_schema.role_table_grants evidence'; end if;
 if not exists(
   select 1 from pg_catalog.pg_class c
   cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   where c.oid='public.profiles'::regclass and a.grantee=0 and a.privilege_type='SELECT' and a.is_grantable
 ) then raise exception 'Fixture missing PUBLIC SELECT grant option'; end if;
end
$legacy_acl_preflight$;
select 'LEGACY_FIXTURE_PRECONDITIONS_PASS' as result;
