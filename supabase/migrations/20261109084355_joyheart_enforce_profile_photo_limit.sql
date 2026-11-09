-- Enforce JoyHeart's five-photo limit in the database, including concurrent uploads.
create or replace function public.joyheart_enforce_profile_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  select count(*)::integer into current_count
  from public.profile_photos where user_id = new.user_id;
  if current_count >= 5 then
    raise exception 'JOYHEART_PROFILE_PHOTO_LIMIT_REACHED' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.joyheart_enforce_profile_photo_limit() from public, anon, authenticated;
drop trigger if exists joyheart_profile_photo_limit on public.profile_photos;
create trigger joyheart_profile_photo_limit
before insert on public.profile_photos
for each row execute function public.joyheart_enforce_profile_photo_limit();
create index if not exists profile_photos_user_id_idx on public.profile_photos(user_id);
