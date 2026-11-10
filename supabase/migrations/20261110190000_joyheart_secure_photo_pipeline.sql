-- JOYHEART ROUND 5B: server-validated photo ingestion and revocable delivery.
-- Review branch only. Do not apply to the live project without explicit approval.
begin;

-- All stored objects are normalized WebP and must remain in a private bucket.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/webp']
where id = 'joyheart-profile-photos';
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'joyheart-profile-photos') then
    raise exception 'JOYHEART_PROFILE_PHOTO_BUCKET_MISSING';
  end if;
end $$;

alter table public.profile_photos
  add column if not exists source_mime_type text,
  add column if not exists source_file_size_bytes integer,
  add column if not exists image_width integer,
  add column if not exists image_height integer,
  add column if not exists sha256_hex text;

alter table public.profile_photos
  drop constraint if exists profile_photos_source_mime_type_check,
  drop constraint if exists profile_photos_source_size_check,
  drop constraint if exists profile_photos_dimensions_check,
  drop constraint if exists profile_photos_sha256_check;

alter table public.profile_photos
  add constraint profile_photos_source_mime_type_check
    check (source_mime_type is null or source_mime_type in ('image/jpeg','image/png','image/webp')),
  add constraint profile_photos_source_size_check
    check (source_file_size_bytes is null or source_file_size_bytes between 1 and 5242880),
  add constraint profile_photos_dimensions_check
    check ((image_width is null and image_height is null) or
      (image_width is not null and image_height is not null and image_width between 1 and 8192 and image_height between 1 and 8192 and image_width::bigint * image_height::bigint <= 6000000)),
  add constraint profile_photos_sha256_check
    check (sha256_hex is null or sha256_hex ~ '^[0-9a-f]{64}$');

create table if not exists public.profile_photo_moderation_events (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references public.profile_photos(id) on delete set null,
  member_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','approved','rejected','removed')),
  reason text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint profile_photo_event_reason_length check (reason is null or char_length(reason) <= 500)
);
create index if not exists profile_photo_moderation_events_photo_created_idx
  on public.profile_photo_moderation_events(photo_id, created_at desc);
alter table public.profile_photo_moderation_events enable row level security;
alter table public.profile_photo_moderation_events force row level security;
revoke all on public.profile_photo_moderation_events from public, anon, authenticated, service_role;
grant select on public.profile_photo_moderation_events to service_role;

-- A removed photo no longer consumes one of the five active slots.
create or replace function public.joyheart_enforce_profile_photo_limit()
returns trigger language plpgsql set search_path = '' as $$
declare current_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  select count(*)::integer into current_count
  from public.profile_photos
  where user_id = new.user_id and moderation_status <> 'removed';
  if current_count >= 5 then
    raise exception 'JOYHEART_PROFILE_PHOTO_LIMIT_REACHED' using errcode = '23514';
  end if;
  return new;
end;
$$;
alter function public.joyheart_enforce_profile_photo_limit() owner to postgres;
revoke all on function public.joyheart_enforce_profile_photo_limit() from public, anon, authenticated;

-- The browser can no longer create photo metadata or upload/delete bucket objects.
-- Only the server route, using the Cloudflare SUPABASE_SERVICE_ROLE_KEY secret,
-- may upload the normalized image and register its metadata.
drop policy if exists "profile_photos_owner_insert_pending" on public.profile_photos;
drop policy if exists "profile_photos_owner_delete" on public.profile_photos;
revoke insert, update, delete on public.profile_photos from public, anon, authenticated;
grant select on public.profile_photos to authenticated;
grant all on public.profile_photos to service_role;

drop policy if exists "joyheart_photo_owner_upload" on storage.objects;
drop policy if exists "joyheart_photo_owner_delete" on storage.objects;

-- The staff check also requires an active, verified, non-banned account.
create or replace function public.joyheart_is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.staff_roles sr
    join auth.users u on u.id = sr.user_id
    where sr.user_id = auth.uid()
      and sr.is_active is true
      and sr.role in ('moderator','admin')
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= pg_catalog.now())
  );
$$;
alter function public.joyheart_is_active_staff() owner to postgres;
revoke all on function public.joyheart_is_active_staff() from public, anon;
grant execute on function public.joyheart_is_active_staff() to authenticated;

-- Private authorization predicate used only by the server-side delivery API.
create or replace function private.joyheart_photo_access_allowed(p_photo_id uuid, p_viewer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profile_photos ph
    join public.profiles owner_profile on owner_profile.user_id = ph.user_id
    where ph.id = p_photo_id
      and ph.moderation_status = 'approved'
      and owner_profile.publication_status = 'published'
      and owner_profile.is_visible is true
      and private.joyheart_is_match_eligible(ph.user_id)
      and private.joyheart_is_match_eligible(p_viewer_id)
      and p_viewer_id is not null
      and p_viewer_id <> ph.user_id
      and not exists (
        select 1 from public.profile_blocks b
        where (b.blocker_id = p_viewer_id and b.blocked_id = ph.user_id)
           or (b.blocker_id = ph.user_id and b.blocked_id = p_viewer_id)
      )
      and (
        private.joyheart_can_discover_pair(p_viewer_id, ph.user_id)
        or exists (
          select 1 from public.profile_matches m
          where m.member_low = least(p_viewer_id, ph.user_id)
            and m.member_high = greatest(p_viewer_id, ph.user_id)
            and m.status = 'active'
        )
      )
  );
$$;
alter function private.joyheart_photo_access_allowed(uuid,uuid) owner to postgres;
revoke all on function private.joyheart_photo_access_allowed(uuid,uuid) from public, anon, authenticated;

-- Owner previews are private to the owner and stop working after removal.
create or replace function public.joyheart_can_read_owned_profile_photo(p_storage_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profile_photos ph
    where ph.storage_path = p_storage_path
      and ph.user_id = auth.uid()
      and ph.moderation_status <> 'removed'
  );
$$;
alter function public.joyheart_can_read_owned_profile_photo(text) owner to postgres;
revoke all on function public.joyheart_can_read_owned_profile_photo(text) from public, anon;
grant execute on function public.joyheart_can_read_owned_profile_photo(text) to authenticated;

-- Staff storage access is limited to pending submissions, never rejected,
-- removed or already-approved objects through the moderation privilege.
create or replace function public.joyheart_can_read_pending_staff_photo(p_storage_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.joyheart_is_active_staff() and exists (
    select 1 from public.profile_photos ph
    where ph.storage_path = p_storage_path
      and ph.moderation_status = 'pending'
      and ph.user_id <> auth.uid()
  );
$$;
alter function public.joyheart_can_read_pending_staff_photo(text) owner to postgres;
revoke all on function public.joyheart_can_read_pending_staff_photo(text) from public, anon;
grant execute on function public.joyheart_can_read_pending_staff_photo(text) to authenticated;

drop policy if exists "joyheart_photo_owner_read" on storage.objects;
create policy "joyheart_photo_owner_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and public.joyheart_can_read_owned_profile_photo(name)
  );

drop policy if exists "joyheart_photo_staff_review_read" on storage.objects;
create policy "joyheart_photo_staff_review_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and public.joyheart_can_read_pending_staff_photo(name)
  );

-- Approved member delivery is performed only by the authenticated API route
-- using a service-role signed URL after the eligibility RPC. Members cannot
-- query storage.objects or enumerate approved object paths directly.
drop policy if exists "joyheart_photo_approved_delivery_read" on storage.objects;

-- Replace the earlier broad owner-or-staff metadata policy. PostgreSQL combines
-- permissive policies with OR, so leaving that legacy policy in place would let
-- staff read approved/rejected/removed metadata despite the pending-only policy.
-- Restore a separate owner-only read policy for the member photo list.
drop policy if exists "profile_photos_owner_or_staff_read" on public.profile_photos;
drop policy if exists "profile_photos_owner_read" on public.profile_photos;
drop policy if exists "profile_photos_staff_review_queue" on public.profile_photos;
create policy "profile_photos_owner_read"
  on public.profile_photos for select to authenticated
  using (user_id = (select auth.uid()));

-- Staff can inspect metadata only while a photo is pending moderation.
create policy "profile_photos_staff_review_queue"
  on public.profile_photos for select to authenticated
  using (
    public.joyheart_is_active_staff()
    and user_id <> (select auth.uid())
    and moderation_status = 'pending'
  );

drop function if exists public.joyheart_get_member_primary_photo(uuid);
create or replace function public.joyheart_get_member_primary_photo(p_member_id uuid, p_viewer_id uuid)
returns table(photo_id uuid, storage_path text, mime_type text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'JOYHEART_PHOTO_SERVER_REQUIRED' using errcode = '42501';
  end if;
  return query
    select ph.id, ph.storage_path, ph.mime_type
    from public.profile_photos ph
    where ph.user_id = p_member_id
      and ph.moderation_status = 'approved'
      and private.joyheart_photo_access_allowed(ph.id, p_viewer_id)
    order by ph.created_at asc, ph.id asc
    limit 1;
end;
$$;
alter function public.joyheart_get_member_primary_photo(uuid,uuid) owner to postgres;
revoke all on function public.joyheart_get_member_primary_photo(uuid,uuid) from public, anon, authenticated;
grant execute on function public.joyheart_get_member_primary_photo(uuid,uuid) to service_role;

-- This RPC is intentionally callable only with the server's service-role key.
create or replace function public.joyheart_register_profile_photo(
  p_user_id uuid,
  p_storage_path text,
  p_source_mime_type text,
  p_source_file_size_bytes integer,
  p_file_size_bytes integer,
  p_image_width integer,
  p_image_height integer,
  p_sha256_hex text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_photo_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'JOYHEART_PHOTO_SERVER_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null
     or p_source_mime_type is null or p_source_mime_type not in ('image/jpeg','image/png','image/webp')
     or p_source_file_size_bytes is null or p_source_file_size_bytes not between 1 and 5242880
     or p_file_size_bytes is null or p_file_size_bytes not between 1 and 5242880
     or p_image_width is null or p_image_width not between 1 and 8192
     or p_image_height is null or p_image_height not between 1 and 8192
     or p_image_width::bigint * p_image_height::bigint > 6000000
     or p_sha256_hex is null or p_sha256_hex !~ '^[0-9a-f]{64}$'
     or p_storage_path is null or p_storage_path !~ ('^' || p_user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$') then
    raise exception 'JOYHEART_PHOTO_METADATA_INVALID' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'joyheart-profile-photos' and o.name = p_storage_path
  ) then
    raise exception 'JOYHEART_PHOTO_OBJECT_MISSING' using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from auth.users u
    join public.profiles p on p.user_id = u.id
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= pg_catalog.now())
      and p.publication_status <> 'restricted'
  ) then
    raise exception 'JOYHEART_PROFILE_NOT_AVAILABLE' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  if (select count(*) from public.profile_photos
      where user_id = p_user_id and moderation_status <> 'removed') >= 5 then
    raise exception 'JOYHEART_PROFILE_PHOTO_LIMIT_REACHED' using errcode = '23514';
  end if;

  insert into public.profile_photos(
    user_id, storage_path, mime_type, file_size_bytes, moderation_status,
    source_mime_type, source_file_size_bytes, image_width, image_height, sha256_hex
  ) values (
    p_user_id, p_storage_path, 'image/webp', p_file_size_bytes, 'pending',
    p_source_mime_type, p_source_file_size_bytes, p_image_width, p_image_height, p_sha256_hex
  ) returning id into new_photo_id;

  insert into public.profile_photo_moderation_events(photo_id,member_id,actor_id,event_type)
  values (new_photo_id,p_user_id,p_user_id,'submitted');
  return new_photo_id;
end;
$$;
alter function public.joyheart_register_profile_photo(uuid,text,text,integer,integer,integer,integer,text) owner to postgres;
revoke all on function public.joyheart_register_profile_photo(uuid,text,text,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.joyheart_register_profile_photo(uuid,text,text,integer,integer,integer,integer,text) to service_role;

create or replace function public.joyheart_remove_profile_photo(p_photo_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare photo_owner uuid; photo_status text;
begin
  if auth.uid() is null then raise exception 'JOYHEART_AUTH_REQUIRED' using errcode = '42501'; end if;
  select user_id, moderation_status into photo_owner, photo_status
  from public.profile_photos where id = p_photo_id for update;
  if not found or photo_owner <> auth.uid() then
    raise exception 'JOYHEART_PHOTO_NOT_FOUND' using errcode = 'P0002';
  end if;
  if photo_status = 'removed' then return; end if;
  update public.profile_photos set moderation_status = 'removed' where id = p_photo_id;
  insert into public.profile_photo_moderation_events(photo_id,member_id,actor_id,event_type)
  values (p_photo_id,photo_owner,auth.uid(),'removed');
end;
$$;
alter function public.joyheart_remove_profile_photo(uuid) owner to postgres;
revoke all on function public.joyheart_remove_profile_photo(uuid) from public, anon;
grant execute on function public.joyheart_remove_profile_photo(uuid) to authenticated;

-- Preserve the existing review checks and add an immutable audit event.
create or replace function public.joyheart_review_profile_photo(
  p_photo_id uuid, p_decision text, p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := auth.uid(); photo_owner uuid; current_status text;
begin
  if reviewer_id is null or not public.joyheart_is_active_staff() then
    raise exception 'JOYHEART_STAFF_REQUIRED' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'JOYHEART_INVALID_REVIEW_DECISION' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'JOYHEART_REVIEW_REASON_TOO_LONG' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(pg_catalog.btrim(p_reason),'') is null then
    raise exception 'JOYHEART_REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;
  select user_id, moderation_status into photo_owner, current_status
  from public.profile_photos where id = p_photo_id for update;
  if not found then raise exception 'JOYHEART_PHOTO_NOT_FOUND' using errcode = 'P0002'; end if;
  if photo_owner = reviewer_id then raise exception 'JOYHEART_CANNOT_REVIEW_OWN_PHOTO' using errcode = '42501'; end if;
  if current_status <> 'pending' then raise exception 'JOYHEART_PHOTO_NOT_PENDING' using errcode = '55000'; end if;

  update public.profile_photos
  set moderation_status = p_decision, reviewed_by = reviewer_id,
      reviewed_at = pg_catalog.now(), review_reason = nullif(pg_catalog.btrim(p_reason),'')
  where id = p_photo_id;
  insert into public.profile_photo_moderation_events(photo_id,member_id,actor_id,event_type,reason)
  values (p_photo_id,photo_owner,reviewer_id,p_decision,nullif(pg_catalog.btrim(p_reason),''));
end;
$$;
alter function public.joyheart_review_profile_photo(uuid,text,text) owner to postgres;
revoke all on function public.joyheart_review_profile_photo(uuid,text,text) from public, anon;
grant execute on function public.joyheart_review_profile_photo(uuid,text,text) to authenticated;

commit;
