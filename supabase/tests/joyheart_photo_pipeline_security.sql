\set ON_ERROR_STOP on

-- All identities, paths and images are synthetic test fixtures.
\set member_a '11111111-1111-4111-8111-111111111111'
\set member_b '22222222-2222-4222-8222-222222222222'
\set staff_id  '33333333-3333-4333-8333-333333333333'
\set photo_a  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
\set photo_b  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
\set photo_pending 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
\set photo_rejected 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
\set photo_staff 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
\set path_a '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp'
\set path_b '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp'
\set path_pending '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp'
\set path_rejected '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp'
\set path_staff '33333333-3333-4333-8333-333333333333/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.webp'
\set path_registered '22222222-2222-4222-8222-222222222222/99999999-9999-4999-8999-999999999999.webp'
\set path_limit '22222222-2222-4222-8222-222222222222/66666666-6666-4666-8666-666666666666.webp'
\set path_banned '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555.webp'

do $$
declare bucket_public boolean; bucket_limit bigint; bucket_types text[];
begin
  select public, file_size_limit, allowed_mime_types
    into bucket_public, bucket_limit, bucket_types
  from storage.buckets where id = 'joyheart-profile-photos';
  if bucket_public is distinct from false or bucket_limit <> 5242880 or bucket_types <> array['image/webp'] then
    raise exception 'Photo bucket is not private, 5 MB limited and WebP-only';
  end if;
end $$;

insert into auth.users (id, email_confirmed_at) values
  (:'member_a'::uuid, now()),
  (:'member_b'::uuid, now()),
  (:'staff_id'::uuid, now());

insert into public.profiles (user_id, publication_status, is_visible) values
  (:'member_a'::uuid, 'published', true),
  (:'member_b'::uuid, 'published', true),
  (:'staff_id'::uuid, 'published', true);

insert into public.profile_private (user_id, date_of_birth) values
  (:'member_a'::uuid, (current_date - interval '30 years')::date),
  (:'member_b'::uuid, (current_date - interval '29 years')::date),
  (:'staff_id'::uuid, (current_date - interval '40 years')::date);

insert into public.staff_roles (user_id, role, is_active)
values (:'staff_id'::uuid, 'admin', true);

insert into storage.objects (bucket_id, name) values
  ('joyheart-profile-photos', :'path_a'),
  ('joyheart-profile-photos', :'path_b'),
  ('joyheart-profile-photos', :'path_pending'),
  ('joyheart-profile-photos', :'path_rejected'),
  ('joyheart-profile-photos', :'path_staff'),
  ('joyheart-profile-photos', :'path_banned');

insert into public.profile_photos (id, user_id, storage_path, mime_type, file_size_bytes, moderation_status)
values
  (:'photo_a'::uuid, :'member_a'::uuid, :'path_a', 'image/webp', 200, 'approved'),
  (:'photo_b'::uuid, :'member_b'::uuid, :'path_b', 'image/webp', 200, 'approved'),
  (:'photo_pending'::uuid, :'member_b'::uuid, :'path_pending', 'image/webp', 200, 'pending'),
  (:'photo_rejected'::uuid, :'member_b'::uuid, :'path_rejected', 'image/webp', 200, 'rejected'),
  (:'photo_staff'::uuid, :'staff_id'::uuid, :'path_staff', 'image/webp', 200, 'pending');

do $$
begin
  begin
    insert into public.profile_photos (user_id, storage_path, mime_type, file_size_bytes, image_width, image_height)
    values ('11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777.webp',
      'image/webp', 200, 2, null);
    raise exception 'Photo dimension constraint accepted one missing dimension';
  exception when check_violation then null;
  end;
end $$;

-- Authenticated members cannot read another member's photo rows or object names,
-- call the service-only path RPC, write metadata, self-approve or read audit data.
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'member_a', false);
do $$
declare n integer;
begin
  select count(*) into n from public.profile_photos where user_id = '11111111-1111-4111-8111-111111111111';
  if n <> 1 then raise exception 'Member cannot read their own photo metadata'; end if;

  select count(*) into n from public.profile_photos where user_id = '22222222-2222-4222-8222-222222222222';
  if n <> 0 then raise exception 'Member read another member photo metadata'; end if;

  select count(*) into n from storage.objects where name = '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp';
  if n <> 0 then raise exception 'Member enumerated another member object path'; end if;

  begin
    perform * from public.joyheart_get_member_primary_photo(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'Authenticated member executed service-only delivery RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.joyheart_register_profile_photo(
      '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111/99999999-9999-4999-8999-999999999999.webp',
      'image/png', 1000, 200, 2, 2, repeat('a',64)
    );
    raise exception 'Authenticated member executed service-only registration RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.profile_photos (user_id, storage_path, mime_type, file_size_bytes)
    values ('11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111/88888888-8888-4888-8888-888888888888.webp',
      'image/webp', 200);
    raise exception 'Authenticated member inserted photo metadata directly';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profile_photos set moderation_status = 'approved'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    raise exception 'Authenticated member changed moderation status directly';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
    values ('joyheart-profile-photos',
      '11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777.webp');
    raise exception 'Authenticated member uploaded directly to Storage';
  exception when insufficient_privilege then null;
  end;

  begin
    select count(*) into n from public.profile_photo_moderation_events;
    raise exception 'Authenticated member read moderation audit events';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Server-only registration requires a real private object and validated metadata.
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claim.sub', '', false);
insert into storage.objects (bucket_id, name) values ('joyheart-profile-photos', :'path_registered');
select public.joyheart_register_profile_photo(
  :'member_b'::uuid, :'path_registered', 'image/png', 1000, 200, 2, 2, repeat('a',64)
) as registered_photo_id \gset
select set_config('joyheart.test.registered_photo_id', :'registered_photo_id', false);

do $$
begin
  begin
    perform public.joyheart_register_profile_photo(
      '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222/88888888-8888-4888-8888-888888888888.webp',
      null, 1000, 200, 2, 2, repeat('a',64)
    );
    raise exception 'Registration accepted null source MIME type';
  exception when sqlstate '22023' then null;
  end;

  begin
    update public.profile_photo_moderation_events set reason = 'tampered';
    raise exception 'Service role mutated immutable moderation audit';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.profile_photo_moderation_events;
    raise exception 'Service role deleted immutable moderation audit';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Service-side registration also rejects banned members.
update auth.users set banned_until = now() + interval '1 hour' where id = :'member_b'::uuid;
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
do $$
begin
  begin
    perform public.joyheart_register_profile_photo(
      '22222222-2222-4222-8222-222222222222',
      '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555.webp',
      'image/png', 1000, 200, 2, 2, repeat('c',64)
    );
    raise exception 'Banned member was allowed to register a photo';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update auth.users set banned_until = null where id = :'member_b'::uuid;

-- The owner may preview their own pending image. Active staff may see only
-- other members' pending queue items, not approved or rejected object paths.
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'member_b', false);
do $$
declare n integer;
begin
  select count(*) into n from storage.objects where name = '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp';
  if n <> 1 then raise exception 'Owner cannot read own pending photo'; end if;
end $$;
select set_config('request.jwt.claim.sub', :'staff_id', false);
do $$
declare n integer;
begin
  if not public.joyheart_is_active_staff() then raise exception 'Verified active staff was not recognized'; end if;

  select count(*) into n from public.profile_photos
  where user_id = '22222222-2222-4222-8222-222222222222' and moderation_status = 'pending';
  if n <> 2 then raise exception 'Staff pending queue did not return only the two pending photos'; end if;

  select count(*) into n from public.profile_photos
  where user_id = '22222222-2222-4222-8222-222222222222' and moderation_status in ('approved','rejected','removed');
  if n <> 0 then raise exception 'Staff could read non-pending photo metadata through a legacy RLS policy'; end if;

  select count(*) into n from storage.objects
  where name = '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp';
  if n <> 1 then raise exception 'Staff could not read pending review object'; end if;

  select count(*) into n from storage.objects
  where name in (
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp',
    '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp'
  );
  if n <> 0 then raise exception 'Staff could read approved or rejected object'; end if;

  begin
    perform public.joyheart_review_profile_photo('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'approved', null);
    raise exception 'Staff reviewed their own photo';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A verified staff account loses moderation rights while banned.
reset role;
update auth.users set banned_until = now() + interval '1 hour' where id = :'staff_id'::uuid;
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'staff_id', false);
do $$
begin
  if public.joyheart_is_active_staff() then raise exception 'Banned staff remained authorized'; end if;
end $$;
reset role;
update auth.users set banned_until = null where id = :'staff_id'::uuid;
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'staff_id', false);

select public.joyheart_review_profile_photo(:'registered_photo_id'::uuid, 'approved', null);
reset role;
do $$
declare n integer;
begin
  select count(*) into n from public.profile_photos
  where id = current_setting('joyheart.test.registered_photo_id')::uuid and moderation_status = 'approved'
    and reviewed_by = '33333333-3333-4333-8333-333333333333' and reviewed_at is not null;
  if n <> 1 then raise exception 'Approval did not set status, reviewer and timestamp'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'staff_id', false);
do $$
begin
  begin
    perform public.joyheart_review_profile_photo('cccccccc-cccc-4ccc-8ccc-cccccccccccc', null, null);
    raise exception 'Null review decision was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.joyheart_review_profile_photo('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'rejected', null);
    raise exception 'Rejection accepted without a reason';
  exception when sqlstate '22023' then null;
  end;
end $$;
select public.joyheart_review_profile_photo('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'rejected', 'Contains prohibited personal contact details');

do $$
declare n integer;
begin
  select count(*) into n from storage.objects
  where name in (
    '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp',
    '22222222-2222-4222-8222-222222222222/99999999-9999-4999-8999-999999999999.webp'
  );
  if n <> 0 then raise exception 'Staff retained Storage access after review decision'; end if;
end $$;
reset role;

-- Delivery path is available only to service-role API code and is re-evaluated
-- against publication, visibility, eligibility, mutual access and both block directions.
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
do $$
declare n integer;
begin
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Discovery photo access bypassed the closed global discovery gate'; end if;

  insert into public.profile_matches (member_low, member_high, status)
  values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','active');
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 1 then raise exception 'Active match did not grant photo access'; end if;

  insert into public.profile_blocks (blocker_id, blocked_id)
  values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Delivery allowed after viewer blocked member'; end if;
  delete from public.profile_blocks;

  insert into public.profile_blocks (blocker_id, blocked_id)
  values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Delivery allowed after member blocked viewer'; end if;
  delete from public.profile_blocks;

  update public.profiles set is_visible = false where user_id = '22222222-2222-4222-8222-222222222222';
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Delivery allowed while profile hidden'; end if;
  update public.profiles set is_visible = true where user_id = '22222222-2222-4222-8222-222222222222';

  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 1 then raise exception 'Active match did not restore photo access after profile was made visible'; end if;

  update public.profile_matches set status = 'unmatched';
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Delivery allowed after match ended'; end if;

  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222'
  );
  if n <> 0 then raise exception 'Member could resolve their own public delivery URL'; end if;
end $$;
reset role;

-- A member can remove their own rejected photo; it immediately loses Storage
-- read access, while its audit row remains. Orphan cleanup can now delete it.
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'member_b', false);
select public.joyheart_remove_profile_photo('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select public.joyheart_remove_profile_photo('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
reset role;
do $$
declare n integer;
begin
  select count(*) into n from public.profile_photo_moderation_events
  where photo_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and event_type = 'removed';
  if n <> 1 then raise exception 'Idempotent removal created duplicate audit events'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'member_b', false);
do $$
declare n integer;
begin
  select count(*) into n from storage.objects
  where name = '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp';
  if n <> 0 then raise exception 'Removed photo remained readable to its owner'; end if;

  select count(*) into n from public.profile_photos
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and moderation_status = 'removed';
  if n <> 1 then raise exception 'Removal did not retain metadata in removed state'; end if;
end $$;
reset role;

-- A removed object no longer consumes a slot. Five active photos block a sixth.
insert into storage.objects (bucket_id, name) values
  ('joyheart-profile-photos', '22222222-2222-4222-8222-222222222222/77777777-7777-4777-8777-777777777777.webp'),
  ('joyheart-profile-photos', '22222222-2222-4222-8222-222222222222/88888888-8888-4888-8888-888888888888.webp'),
  ('joyheart-profile-photos', :'path_limit');
insert into public.profile_photos (id, user_id, storage_path, mime_type, file_size_bytes, moderation_status)
values
  ('77777777-7777-4777-8777-777777777777', :'member_b'::uuid,
   '22222222-2222-4222-8222-222222222222/77777777-7777-4777-8777-777777777777.webp', 'image/webp', 200, 'pending'),
  ('88888888-8888-4888-8888-888888888888', :'member_b'::uuid,
   '22222222-2222-4222-8222-222222222222/88888888-8888-4888-8888-888888888888.webp', 'image/webp', 200, 'rejected');
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
do $$
begin
  begin
    perform public.joyheart_register_profile_photo(
      '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222/66666666-6666-4666-8666-666666666666.webp',
      'image/png', 1000, 200, 2, 2, repeat('b',64)
    );
    raise exception 'Sixth active photo was accepted';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- Removing the remaining approved photos immediately revokes future delivery.
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'member_b', false);
select public.joyheart_remove_profile_photo('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select public.joyheart_remove_profile_photo(current_setting('joyheart.test.registered_photo_id')::uuid);
do $$
declare n integer;
begin
  select count(*) into n from storage.objects
  where name in (
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp',
    '22222222-2222-4222-8222-222222222222/99999999-9999-4999-8999-999999999999.webp'
  );
  if n <> 0 then raise exception 'Owner retained read access to removed approved objects'; end if;
end $$;
reset role;
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
do $$
declare n integer;
begin
  select count(*) into n from public.joyheart_get_member_primary_photo(
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'
  );
  if n <> 0 then raise exception 'Approved-photo delivery remained available after all approved photos were removed'; end if;
end $$;
reset role;

-- Deactivated staff lose all moderation authority.
update public.staff_roles set is_active = false where user_id = :'staff_id'::uuid;
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', :'staff_id', false);
do $$
begin
  if public.joyheart_is_active_staff() then raise exception 'Deactivated staff remained authorized'; end if;
  begin
    perform public.joyheart_review_profile_photo('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'approved', null);
    raise exception 'Deactivated staff reviewed a photo';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Final audit assertions: submission, approval, rejection and removal are retained.
set role service_role;
select set_config('request.jwt.claim.role', 'service_role', false);
do $$
declare n integer;
begin
  select count(*) into n from public.profile_photo_moderation_events;
  if n <> 6 then raise exception 'Expected six immutable audit events, found %', n; end if;
end $$;
reset role;

select json_build_object(
  'postgres', current_setting('server_version'),
  'synthetic_members', 2,
  'synthetic_staff', 1,
  'audit_events', 6,
  'member_object_listing', 'denied',
  'staff_scope', 'pending only',
  'member_delivery', 'server-only with block/visibility/match rechecks',
  'photo_removal', 'storage read revoked; metadata retained'
) as photo_pipeline_security_evidence;
