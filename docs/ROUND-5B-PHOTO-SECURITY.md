# JoyHeart Round 5B — Secure photo pipeline

## Scope and release boundary

Round 5B continues the existing phase-2/review-fixes branch. It does not create a staging environment, a second Supabase project, or new Cloudflare infrastructure. PostgreSQL 17 in GitHub Actions is a disposable test database created only for CI; it is not a staging environment.

The migration is review-only. Do not merge to main, deploy, apply the migration to the live Supabase project, or change live Cloudflare settings until the user explicitly approves the completed evidence report.

## Upload and normalization

1. The upload API requires a signed-in user, a same-origin request, and multipart form data.
2. The request body is streamed with a bounded byte limit. The accepted source formats are JPEG, PNG and WebP; the server checks file signatures rather than trusting the browser MIME type.
3. The Worker-compatible decoder validates the actual image data, dimensions and pixel count. The current limits are 5 MiB source bytes, 8,192 pixels per dimension, and 6,000,000 total pixels.
4. Images are decoded and re-encoded as WebP. Re-encoding strips source metadata such as EXIF. The normalized object name is a random UUID under the authenticated owner's UUID prefix.
5. The private joyheart-profile-photos bucket accepts only WebP, has a 5 MiB limit, and is not publicly readable. Browser clients cannot upload, delete or directly read storage objects.

The service-role key is server-only. When deployment is explicitly approved, configure SUPABASE_SERVICE_ROLE_KEY as a Cloudflare Worker secret. Never put it in NEXT_PUBLIC variables, client-side code, source control, or ordinary GitHub variables. The existing Supabase URL and publishable key remain the public client bindings.

## Moderation lifecycle

- Upload validation completes before the server writes a private WebP object.
- A server-only RPC registers the object as pending, records source/output sizes, dimensions and a SHA-256 digest, and writes a submission audit event. The five-active-photo limit is serialized with a per-member transaction advisory lock in the RPC and independently enforced by a database insert trigger, so future privileged insert paths cannot bypass the cap.
- Active staff must be authenticated, email-verified, not deleted or banned, and assigned an active public.staff_roles row.
- Staff can inspect only other members' pending photos. The migration explicitly removes the earlier permissive `profile_photos_owner_or_staff_read` policy before adding separate owner-only and pending-staff policies; PostgreSQL combines permissive policies with OR, so leaving the old policy would expose all photo metadata to staff. Members retain read access to their own photo rows. Staff cannot review their own photos. Rejections require a non-empty reason of at most 500 characters.
- Review and removal actions are server-controlled. Members cannot change moderation status directly.
- The moderation event table is not writable or deletable by application roles. Security-definer RPCs append submission, approval, rejection and removal events.

## Approved-photo delivery and revocation

Members do not receive direct Storage read access to other members' photos. The authenticated delivery API uses a service-only database function to re-check, on every request:

- the target photo is approved and not removed;
- the target profile is published and visible;
- the viewer and target satisfy the existing eligibility checks;
- the existing discovery eligibility function or an active match permits access; and
- neither member has blocked the other.

The global discovery feature flag remains OFF and is not changed by Round 5B. Until that existing launch gate is enabled, the active-match path is the only delivery path exercised by the database security tests. When discovery is enabled later, the existing mutual-eligibility function remains the discovery gate.

The API creates a signed URL with a 30-second lifetime and redirects the viewer to it. A new request is denied immediately after a block, profile hide, rejection, removal or ended match. A signed URL already issued can remain usable until its 30-second expiry; this is the maximum revocation delay for an already-issued URL. Removing the underlying object may revoke it sooner.

## Orphan and removed-object cleanup

The staff cleanup endpoint scans only old objects. It retains objects referenced by pending, approved or rejected photo rows. Unreferenced objects and objects whose metadata status is removed are eligible for deletion. A metadata lookup failure stops the batch without deleting files. Approved objects are never selected for cleanup.

## Validation

Run the following checks on the review branch:

- npm run test:photo-cleanup — confirms approved, pending and rejected objects are retained, while removed and unreferenced objects are eligible for cleanup.
- npm run test:photo-worker-runtime — starts the actual Vinext/Cloudflare local Worker runtime with synthetic JPEG, PNG and WebP fixtures; checks decoding, normalization, SHA-256 output digests, PNG chunk CRCs, EXIF stripping, malformed/corrupt/truncated inputs, spoofed MIME, animated formats, pixel limits, byte limits, and upload, staff-review and delete API boundary responses.
- GitHub Actions workflow JoyHeart Photo Pipeline Security Validation — applies the migration to a disposable PostgreSQL 17 database and runs synthetic RLS, Storage, staff, lifecycle, audit and delivery assertions.
- The existing validation workflow runs the production build, compatibility check and dependency audit.

These tests do not access production Supabase, use real member photos, create a staging environment, or deploy anything.
