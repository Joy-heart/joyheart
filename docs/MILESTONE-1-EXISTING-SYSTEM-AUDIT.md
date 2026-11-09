# JoyHeart — Milestone 1 Existing System Audit

**Audit date:** 9 November 2026  
**Repository:** `Joy-heart/joyheart`  
**Production domain:** `joyheart.app`  
**Supabase project:** `JoyHeart` (`quiyoobztyzebocqttoa`, `eu-west-1`)  
**Cloudflare Worker:** `joyheart`  
**Status:** Read-only audit; no production or source changes were made as part of the inspection.

## 1. Executive summary

JoyHeart has a working production web entry point on its custom domain and an established GitHub → Cloudflare Worker deployment path. The application uses React with the Vinext/Cloudflare Vite integration and Supabase for authentication, PostgreSQL and private profile-photo storage.

The database foundation is substantially present: member profiles, private birth-date handling, photo moderation, matching/messaging tables and RPCs, row-level security (RLS), and a private storage bucket exist in the live project. The Supabase security advisor returned no security lint findings during this audit.

**The product is not yet ready to open member discovery.** The live project had zero Auth users and zero rows in the inspected application tables at audit time, so real account journeys, two-member authorization boundaries, matching, messaging and staff workflows could not be validated end-to-end. The discovery page is deliberately a placeholder and says discovery remains closed pending the required checks. Keep it closed until those checks pass.

This report distinguishes verified observations from items that still need hands-on testing. A clean automated advisor result is useful evidence, but it is not proof that every policy or RPC is safe.

## 2. System architecture and deployment

| Area | Observed state |
|---|---|
| Source control | GitHub repository `Joy-heart/joyheart`; default branch `main` |
| Front end | React 19, TypeScript, Vinext 1.3, Vite 8 |
| Supabase client | Supabase JS 2.x and `@supabase/ssr` |
| Hosting/runtime | Cloudflare Worker `joyheart`, deployed through GitHub Actions |
| Production domain | `joyheart.app` and `www.joyheart.app` were reported loading successfully by the owner |
| Database | Supabase PostgreSQL 17.11, region `eu-west-1` |
| Authentication | Supabase Auth, server/browser clients use the public project URL and publishable key |
| Storage | Private Supabase Storage bucket `joyheart-profile-photos` |
| Email | Resend domain and SMTP configuration were prepared; successful delivery was not verified |
| Edge Functions | No Supabase Edge Functions were listed during inspection |

The repository includes `.env.example`, `.github`, `app`, `supabase`, `public`, `cloudflare.config.ts`, `proxy.ts`, `vite.config.ts` and project documentation. The example environment file documents only the public Supabase URL and publishable key and warns against placing service-role credentials or database passwords there.

The browser and server Supabase clients inspected use the publishable key. No service-role key was observed in those client implementations. This is the correct general pattern for member-scoped operations when RLS and user JWTs enforce authorization.

**Credential note:** Cloudflare deployment credentials are managed outside the source files. Their actual values were not inspected or copied into this report. The previously configured Cloudflare token was described as broadly permissioned; review and narrow its scope to the minimum permissions required by the deployment workflow after deployment stability is confirmed. Never commit or paste tokens into source code or chat.

## 3. Application routes and current behavior

Routes observed in the application include:

| Route | Observed behavior / status |
|---|---|
| `/` | Public homepage |
| `/signup` | Registration entry point |
| `/login` | Login entry point |
| `/reset-password` | Password reset route |
| `/auth/callback` | Authentication callback |
| `/account` | Protected member account/profile area |
| `/discover` | Placeholder; discovery intentionally closed |
| `/explore` | Explore/preferences area |
| `/matches` | Reads current member's matches and related profile/conversation data |
| `/messages` | Redirects to `/matches`; dedicated messaging experience is not confirmed |
| `/staff/photos` | Staff photo review area |
| `/api/staff/photos/review` | Staff photo review API endpoint |

The route list is based on the inspected source tree and is not asserted to be a complete crawl of every nested or dynamic route.

### Route and access controls

- `proxy.ts` creates a Supabase server client, refreshes auth cookies, verifies claims, and redirects unauthenticated requests from protected member routes (`/account`, `/discover`, `/matches`, `/messages`) to login.
- The proxy applies private/no-store cache headers to the relevant response path.
- The account page independently checks verified claims and the authenticated user, requires email confirmation, and reads the member's own profile.
- The staff photo page requires a verified user and the `joyheart_is_active_staff()` authorization RPC.
- The staff review API checks request origin/fetch-site context, verifies the user, checks staff authorization, and validates request input.
- The discover page is intentionally non-functional pending release gates.

These code checks are positive indicators. They do not replace direct tests of every route with anonymous, ordinary-member, blocked-member and staff identities.

## 4. Live database inventory

The inspected Supabase project was reported as `ACTIVE_HEALTHY`, running PostgreSQL `17.11.0.018`.

At inspection time:

- 14 migrations were recorded as applied.
- 10 public application tables were found.
- All 10 public application tables had RLS enabled.
- 2 tables had FORCE RLS enabled: `profile_private` and `staff_roles`.
- 14 public table policies were counted.
- 17 public functions were counted.
- 1 private table was found: `private.joyheart_message_evidence`.
- 1 private storage bucket was found: `joyheart-profile-photos`.
- 0 Auth users and 0 confirmed Auth users were present.
- Estimated row counts were zero for all 10 inspected public application tables.
- No Supabase Edge Functions were listed.

### Applied migration versions observed

- `20261108180336 restrict_rls_auto_enable_execution`
- `20261108180340 restrict_rls_auto_enable_function_execution`
- `20261108180553 revoke_public_schema_default_api_grants`
- `20261108180607 remove_remaining_default_object_privileges`
- `20261108205107 create_member_profiles`
- `20261109084033 joyheart_private_birth_date_and_age_gate`
- `20261109084039 joyheart_member_profiles_reconciliation`
- `20261109084043 joyheart_private_profile_photos`
- `20261109084048 joyheart_staff_photo_moderation`
- `20261109084118 joyheart_staff_security_advisor_hardening`
- `20261109084355 joyheart_enforce_profile_photo_limit`
- `20261109101104 joyheart_matching_and_messaging`
- `20261109102807 joyheart_fix_signup_birth_date_validation`
- `20261109105349 joyheart_explore_preferences`

The compatibility-settings migration discussed in earlier development work was not present in this live migration inventory. Do not treat those proposed preference/personality-answer tables as deployed until a fresh migration check confirms them.

### Table policy overview

Observed policy intent included:

- `profiles`: owner update, owner or published-profile read, own draft insert.
- `profile_private`: deny-all to authenticated table access; FORCE RLS.
- `profile_photos`: owner inserts pending photos, owner/staff read under policy, owner delete.
- `profile_matches`: match participants read their matches.
- `conversations`: authenticated participants read conversations.
- `messages`: authenticated conversation participants read messages.
- `profile_blocks`: members read their own blocks.
- `profile_interactions`: members read their own interactions.
- `member_reports`: members read their own reports.
- `staff_roles`: deny-all to authenticated table access; FORCE RLS.

The private photo bucket had four storage policies for owner upload/read/delete and staff review read. The policies were scoped to the photo bucket and member folder path; staff review relied on a private staff authorization check.

The deny-all policies on private data and staff-role tables are fail-closed. Confirm that trusted trigger/RPC paths can perform their intended work without exposing direct table access.

## 5. Authentication and account security

The source contains browser and server Supabase clients. The server-side request guard refreshes cookies and verifies claims rather than trusting the mere presence of a cookie. Protected member routes are redirected when claims are absent or verification fails.

The account route adds further checks for a verified user and email confirmation. A password reset route and auth callback route exist.

**Not verified end-to-end:** signup, email confirmation, login, logout, forgot-password delivery, reset-password completion, expired/invalid tokens, session refresh across browser restarts, and account deletion. The live Auth user count was zero, so these flows were not tested using real accounts.

Resend was configured/prepared for the JoyHeart domain and Supabase SMTP, but a successful test email and actual inbox delivery were not confirmed during this audit. Do not mark email delivery complete until signup confirmation and password reset are tested end-to-end.

## 6. Matching, messaging and member safety

The live database contains matching/messaging foundations and functions for interactions, match/unmatch, blocking, sending/editing/deleting messages, marking conversations read, and reporting members.

The discover page is intentionally a placeholder and explicitly keeps discovery closed until eligibility, publication, photo moderation and two-member matching checks are completed. This is the correct release posture while the security and mutual-consent behavior remains unverified.

The `/matches` page reads the signed-in member's matches and related profiles/conversations. The `/messages` route redirects to `/matches`, so a complete dedicated messaging interface should not be assumed.

Before enabling discovery, test at minimum:
1. Two separate verified member accounts cannot read each other's private profile fields.
2. Draft, unpublished, suspended, or photo-unapproved profiles never appear in discovery.
3. Members below the minimum age or with invalid birth-date data cannot become eligible.
4. A block prevents discovery, interaction, matching and messaging in both directions as designed.
5. A report does not expose reporter identity to the reported member.
6. A match requires the intended mutual-consent sequence.
7. Only conversation participants can read or send messages.
8. Staff-only photo review and staff-role checks cannot be bypassed by ordinary members.
9. Removed/unmatched members lose access according to the product's documented policy.

Do not open public discovery until these checks pass and the results are recorded.

## 7. Security advisor and database performance observations

The Supabase security advisor returned an empty list of security lint findings during this audit.

The performance advisor identified eight foreign keys without supporting indexes:

- `member_reports.member_reports_conversation_id_fkey`
- `member_reports.member_reports_message_id_fkey`
- `member_reports.member_reports_reported_id_fkey`
- `member_reports.member_reports_reporter_id_fkey`
- `messages.messages_reply_to_message_id_fkey`
- `messages.messages_sender_id_fkey`
- `profile_blocks.profile_blocks_blocked_id_fkey`
- `profile_matches.profile_matches_member_high_fkey`

It also listed eight indexes as unused at inspection time:

- `profile_photos_user_id_idx`
- `profile_photos_reviewed_by_idx`
- `staff_roles_created_by_idx`
- `profile_interactions_target_action_idx`
- `messages_conversation_created_idx`
- `conversations_last_message_idx`
- `member_reports_status_created_idx`
- `profiles_visible_updated_at_idx`

Because the database had no application rows and no meaningful production traffic at audit time, an index being labelled unused is not sufficient reason to remove it. Review query plans and expected access patterns before changing indexes. Consider adding the missing foreign-key indexes after checking migration definitions and query workload; do this as a separate reviewed database change, not as part of this documentation PR.

## 8. Integrations and operational boundaries

| Integration | Audit result |
|---|---|
| GitHub | Repository and main branch inspected; deployment workflow is part of the project |
| Cloudflare | Existing `joyheart` Worker and custom-domain setup reported working by owner; secret values not inspected |
| Supabase | Live project healthy; database and storage metadata inspected read-only |
| Resend | Domain/SMTP setup prepared; end-to-end delivery not confirmed |
| Supabase Edge Functions | None listed |
| External analytics/monitoring | Not established by the inspected evidence |

The application uses a single existing Supabase project and a single existing Cloudflare Worker. This audit does not recommend creating staging projects, duplicate databases, extra Workers or parallel hosting infrastructure.

## 9. Findings and recommended order

### Release blockers / must verify before discovery

1. **Real authentication journey:** create controlled test accounts and verify signup, email confirmation, login, reset and logout.
2. **Two-member privacy tests:** exercise RLS and RPC behavior with two distinct members; current zero-user state prevents this validation.
3. **Discovery eligibility and mutual consent:** prove age, publication, moderation, block/report and mutual-match requirements at the database/API boundary.
4. **Staff authorization:** verify the private staff authorization function, staff-role lifecycle and photo-review operations with ordinary and staff accounts.
5. **Photo lifecycle:** test private object paths, owner access, upload limits, moderation approval/rejection and unauthorized object access.
6. **Email delivery:** confirm Resend SMTP works for Supabase Auth confirmation and password reset.

### Important follow-up improvements

7. Review and reduce Cloudflare API token permissions to deployment-only minimum.
8. Review the eight unindexed foreign keys and add indexes where justified by actual query patterns.
9. Retain currently unused indexes until traffic/query evidence supports removal.
10. Complete a dedicated messaging UI and verify its route behavior before describing messaging as fully delivered.
11. Reconcile repository migration files against the live migration inventory, including the compatibility-settings migration previously discussed.
12. Recheck Supabase Data API exposed schemas and function/table exposure settings before launch; dashboard exposure settings were not independently revalidated in this audit.

## 10. Evidence limits and audit boundaries

This is a point-in-time inspection on 9 November 2026. It is not a penetration test, legal/privacy review, load test, or formal certification.

The following were not established from the available read-only evidence:
- successful end-to-end email delivery;
- end-to-end auth behavior with real accounts;
- two-member RLS isolation and matching/messaging tests;
- actual staff-role authorization behavior under real staff and non-staff identities;
- every dynamic route and every UI interaction;
- the exact current Cloudflare secret values or least-privilege scope;
- a complete external integration inventory;
- current Data API exposed-schema settings.

No production database writes, migrations, account creation, storage uploads, credential changes, Cloudflare configuration changes, or application source changes were performed during the audit.

## 11. Audit conclusion

**Overall: foundation established; member launch readiness not yet demonstrated.**

JoyHeart has a live application entry point, an established deployment path, a meaningful Supabase schema, private photo storage, RLS coverage, and initial authentication/staff/matching foundations. The next work should focus on proving the member experience and security boundaries with controlled test accounts, not adding infrastructure.

**Discovery must remain closed until the release-blocking tests in Section 9 are completed and reviewed.**
