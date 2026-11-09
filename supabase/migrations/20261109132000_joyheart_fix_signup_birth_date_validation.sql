-- Correct the signup DOB format validator to use an explicit ASCII digit class.
-- The previous escaped digit expression did not reliably match YYYY-MM-DD.
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
    raise exception 'DATE_OF_BIRTH_REQUIRED' using errcode = '22023';
  end if;
  if (new.raw_user_meta_data ->> 'date_of_birth') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'DATE_OF_BIRTH_INVALID' using errcode = '22023';
  end if;
  begin
    birth_date := (new.raw_user_meta_data ->> 'date_of_birth')::date;
  exception when others then
    raise exception 'DATE_OF_BIRTH_INVALID' using errcode = '22023';
  end;
  if birth_date > current_date then
    raise exception 'DATE_OF_BIRTH_INVALID' using errcode = '22023';
  end if;
  if birth_date > (current_date - interval '18 years')::date then
    raise exception 'JOYHEART_MINIMUM_AGE_18' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.joyheart_validate_signup_age() from public, anon, authenticated;
