-- JoyHeart staff moderation security hardening.
-- Internal SECURITY DEFINER implementations live in the non-exposed private schema.
-- Public RPCs are SECURITY INVOKER wrappers with explicit authenticated grants.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.joyheart_is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.is_active = true
      and sr.role in ('moderator', 'admin')
  );
$$;
alter function private.joyheart_is_active_staff() owner to postgres;
revoke all on function private.joyheart_is_active_staff() from public, anon;
grant execute on function private.joyheart_is_active_staff() to authenticated;

create or replace function public.joyheart_is_active_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.joyheart_is_active_staff();
$$;
revoke all on function public.joyheart_is_active_staff() from public, anon;
grant execute on function public.joyheart_is_active_staff() to authenticated;

create or replace function private.joyheart_review_profile_photo(
  p_photo_id uuid, p_decision text, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := auth.uid();
  photo_owner uuid;
  current_status text;
begin
  if reviewer_id is null or not private.joyheart_is_active_staff() then
    raise exception 'JOYHEART_STAFF_REQUIRED' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'JOYHEART_INVALID_REVIEW_DECISION' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'JOYHEART_REVIEW_REASON_TOO_LONG' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(pg_catalog.btrim(p_reason), '') is null then
    raise exception 'JOYHEART_REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;
  select user_id, moderation_status into photo_owner, current_status
  from public.profile_photos where id = p_photo_id for update;
  if not found then
    raise exception 'JOYHEART_PHOTO_NOT_FOUND' using errcode = 'P0002';
  end if;
  if photo_owner = reviewer_id then
    raise exception 'JOYHEART_CANNOT_REVIEW_OWN_PHOTO' using errcode = '42501';
  end if;
  if current_status <> 'pending' then
    raise exception 'JOYHEART_PHOTO_NOT_PENDING' using errcode = '55000';
  end if;
  update public.profile_photos
  set moderation_status = p_decision,
      reviewed_by = reviewer_id,
      reviewed_at = pg_catalog.now(),
      review_reason = nullif(pg_catalog.btrim(p_reason), '')
  where id = p_photo_id;
end;
$$;
alter function private.joyheart_review_profile_photo(uuid, text, text) owner to postgres;
revoke all on function private.joyheart_review_profile_photo(uuid, text, text) from public, anon;
grant execute on function private.joyheart_review_profile_photo(uuid, text, text) to authenticated;

create or replace function public.joyheart_review_profile_photo(
  p_photo_id uuid, p_decision text, p_reason text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.joyheart_review_profile_photo(p_photo_id, p_decision, p_reason);
$$;
revoke all on function public.joyheart_review_profile_photo(uuid, text, text) from public, anon;
grant execute on function public.joyheart_review_profile_photo(uuid, text, text) to authenticated;

drop policy if exists profile_private_deny_all on public.profile_private;
create policy profile_private_deny_all on public.profile_private
  for all to authenticated using (false) with check (false);
drop policy if exists staff_roles_deny_all on public.staff_roles;
create policy staff_roles_deny_all on public.staff_roles
  for all to authenticated using (false) with check (false);

drop policy if exists profile_photos_owner_read on public.profile_photos;
drop policy if exists profile_photos_staff_review_queue on public.profile_photos;
create policy profile_photos_owner_or_staff_read on public.profile_photos
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (private.joyheart_is_active_staff() and user_id <> (select auth.uid()))
  );

create index if not exists profile_photos_user_id_idx on public.profile_photos(user_id);
create index if not exists profile_photos_reviewed_by_idx on public.profile_photos(reviewed_by);
create index if not exists staff_roles_created_by_idx on public.staff_roles(created_by);

drop policy if exists joyheart_photo_staff_review_read on storage.objects;
create policy joyheart_photo_staff_review_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and private.joyheart_is_active_staff()
    and (storage.foldername(name))[1] <> (select auth.uid())::text
  );
