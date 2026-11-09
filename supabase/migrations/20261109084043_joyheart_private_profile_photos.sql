-- JoyHeart private profile photo storage and moderation metadata.
-- Review-only migration: do not apply to the live Supabase project until approved.
-- Depends on public.profiles from 20261109100000_joyheart_member_profiles.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'joyheart-profile-photos',
  'joyheart-profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 5242880),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint profile_photos_storage_path_owner check (
    storage_path like user_id::text || '/%'
  )
);

comment on table public.profile_photos is
  'Private profile photo metadata. Uploads remain private and pending until trusted moderation approves them.';

alter table public.profile_photos enable row level security;

drop policy if exists "profile_photos_owner_read" on public.profile_photos;
create policy "profile_photos_owner_read"
  on public.profile_photos for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "profile_photos_owner_insert_pending" on public.profile_photos;
create policy "profile_photos_owner_insert_pending"
  on public.profile_photos for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and moderation_status = 'pending'
    and reviewed_at is null
    and storage_path like (select auth.uid())::text || '/%'
  );

drop policy if exists "profile_photos_owner_delete" on public.profile_photos;
create policy "profile_photos_owner_delete"
  on public.profile_photos for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.profile_photos to authenticated;
revoke all on public.profile_photos from anon;

-- Storage objects are readable only by their owner. Public discovery delivery
-- must use a separate trusted moderation-aware endpoint, never a public bucket.
drop policy if exists "joyheart_photo_owner_upload" on storage.objects;
create policy "joyheart_photo_owner_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "joyheart_photo_owner_read" on storage.objects;
create policy "joyheart_photo_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "joyheart_photo_owner_delete" on storage.objects;
create policy "joyheart_photo_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'joyheart-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No client policy/grant can set moderation_status to approved. Approval is
-- reserved for a separately authorized server-side moderation workflow.
