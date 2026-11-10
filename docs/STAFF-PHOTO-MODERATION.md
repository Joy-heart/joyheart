# JoyHeart staff photo moderation setup

The staff photo queue is private. A signed-in, email-verified account cannot access it unless an administrator has assigned an active row in `public.staff_roles`.

## First administrator

After the reviewed migrations have been applied to the existing JoyHeart Supabase project, the project owner must identify the intended staff account from Supabase Authentication and copy that account's Auth user UUID.

Run this SQL in the Supabase SQL Editor, replacing the placeholder with the verified account UUID:

```sql
insert into public.staff_roles (user_id, role, is_active)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid, 'admin', true)
on conflict (user_id) do update
set role = 'admin',
    is_active = true;
```

Do not use an email address in place of the UUID. Do not grant staff access to an account until its owner and purpose have been verified. The application intentionally has no public or self-service role assignment screen.

## Moderator assignment

An existing administrator can add a moderator with the same SQL pattern, changing `admin` to `moderator`. Deactivate access by setting `is_active = false`.

## Access rules

- Staff must be signed in and have a verified email.
- Staff cannot review their own photos.
- Only pending photos can be reviewed.
- Rejections require a reason of no more than 500 characters.
- The joyheart-profile-photos bucket is private, WebP-only and limited to 5 MiB.
- The migration files are review-only until explicitly approved for the live project.
