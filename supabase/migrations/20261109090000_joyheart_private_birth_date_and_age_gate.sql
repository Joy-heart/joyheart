-- JoyHeart: private date of birth and server-enforced 18+ signup gate.
-- REVIEW ONLY: do not run until this migration and signup flow have been reviewed.

create table if not exists public.profile_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint profile_private_birth_date_not_future check (date_of_birth <= current_date)
);

alter table public.profile_private enable row level security;
alter table public.profile_private force row level security;

-- No direct client access to exact date of birth. Future owner-facing
-- correction/access must be implemented through a separately reviewed flow.
revoke all on table public.profile_private from anon, authenticated;
grant all on table public.profile_private to postgres, service_role;

create or replace function public.joyheart_validate_signup_age()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  birth_date date;
begin
  if new.raw_user_meta_data is null
     or not (new.raw_user_meta_data ? 'date_of_birth') then
    raise exception 'DATE_OF_BIRTH_REQUIRED'
      using errcode = '22023';
  end if;

  if (new.raw_user_meta_data ->> 'date_of_birth') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'DATE_OF_BIRTH_INVALID'
      using errcode = '22023';
  end if;

  begin
    birth_date := (new.raw_user_meta_data ->> 'date_of_birth')::date;
  exception when others then
    raise exception 'DATE_OF_BIRTH_INVALID'
      using errcode = '22023';
  end;

  if birth_date > current_date then
    raise exception 'DATE_OF_BIRTH_INVALID'
      using errcode = '22023';
  end if;

  if birth_date > (current_date - interval '18 years')::date then
    raise exception 'JOYHEART_MINIMUM_AGE_18'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.joyheart_store_private_birth_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_private (user_id, date_of_birth)
  values (new.id, (new.raw_user_meta_data ->> 'date_of_birth')::date)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.joyheart_validate_signup_age() from public, anon, authenticated;
revoke all on function public.joyheart_store_private_birth_date() from public, anon, authenticated;

drop trigger if exists joyheart_validate_signup_age on auth.users;
create trigger joyheart_validate_signup_age
before insert on auth.users
for each row execute function public.joyheart_validate_signup_age();

drop trigger if exists joyheart_store_private_birth_date on auth.users;
create trigger joyheart_store_private_birth_date
after insert on auth.users
for each row execute function public.joyheart_store_private_birth_date();

comment on table public.profile_private is
  'Restricted private member data. Exact date of birth is never exposed in public profiles or discovery.';
