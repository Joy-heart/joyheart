-- JoyHeart staff-only profile photo moderation.
-- Review-only migration: do not apply to the live Supabase project until approved.
-- Depends on public.profile_photos and the private joyheart-profile-photos bucket.

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table public.staff_roles is
  'Privileged JoyHeart staff assignments. No member-facing role assignment or self-service grants.';

alter table public.staff_roles enable row level security;
alter table public.staff_roles force row level security;
revoke all on table public.staff_roles from public, anon, authenticated;
grant all on table public.staff_roles to postgres, service_role;

alter table public.profile_photos
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_reason text;

alter table public.profile_photos
  drop constraint if exists profile_photos_review_reason_length;
alter table public.profile_photos
  add constraint profile_photos_review_reason_length
  check (review_reason is null or char_length(review_reason) <= 500);

create or replace function public.joyheart_is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.is_active = true
      and sr.role in ('moderator', 'admin')
  );
$$;

revoke all on function public.joyheart_is_active_staff() from public, anon;
grant execute on function public.joyheart_is_active_staff() to authenticated;

drop policy if exists "profile_photos_staff_review_queue" on public.profile_photos;
create policy "profile_photos_staff_review_queue"
  on public.profile_photos for select
  to authenticated
  using (
    public.joyheart_is_active_staff()
    and user_id <> (select auth.uid())
  );

-- Staff may read private image objects only when the object belongs to a
-- different member. This does not make the bucket public.
drop policy if exists "joyheart_photo_staff_review_read" on storage.objects;
create policy "joyheart_photo_staff_review_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and public.joyheart_is_active_staff()
    and (storage.foldername(name))[1] <> (select auth.uid())::text
  );

create or replace function public.joyheart_review_profile_photo(
  p_photo_id uuid,
  p_decision text,
  p_reason text default null
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
  if reviewer_id is null or not public.joyheart_is_active_staff() then
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

  select user_id, moderation_status
    into photo_owner, current_status
  from public.profile_photos
  where id = p_photo_id
  for update;

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

revoke all on function public.joyheart_review_profile_photo(uuid, text, text)
  from public, anon;
grant execute on function public.joyheart_review_profile_photo(uuid, text, text)
  to authenticated;

comment on function public.joyheart_review_profile_photo(uuid, text, text) is
  'Approve or reject a pending member photo. Requires active staff role and forbids self-review.';

