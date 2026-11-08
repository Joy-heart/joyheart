# JoyHeart Authentication and Account Security Specification

**Status:** Design specification — not an implementation authorization  
**Scope:** Authentication, account lifecycle, session security, and account-abuse controls.

## 1. Security ownership

- Supabase Auth is the only system that stores and verifies account credentials.
- JoyHeart must never store plaintext passwords, password hashes, recovery secrets, or authentication tokens in application tables.
- The browser may use only the Supabase project URL and publishable key.
- Service-role keys, database passwords, signing secrets, and other private credentials must remain server-side in the deployment secret store.
- Authorization is enforced by trusted server-side checks and PostgreSQL Row Level Security (RLS), not by hiding buttons or trusting browser-supplied roles.

## 2. Account creation

Initial release should use email and password with verified email before an account can access discovery or messaging.

Proposed flow:
1. User confirms they meet the minimum age requirement for their country and the JoyHeart minimum age policy.
2. User accepts the current Terms, Privacy Notice, and Community Guidelines; record the policy versions and acceptance time.
3. User submits an email address and password to Supabase Auth over HTTPS.
4. Supabase sends an email verification link.
5. The user verifies the address and returns through an allowlisted JoyHeart redirect.
6. JoyHeart creates or completes the application profile only after the authenticated identity is verified.

Phone verification may be added later as an additional verification or recovery method. It is not required for the first release.

## 3. Login and logout

- Users sign in through Supabase Auth.
- Login errors must not reveal whether a particular email address has an account.
- Rate-limit repeated attempts and apply risk-based delays or additional verification.
- Logout must invalidate the active session through the supported Supabase Auth flow.
- Users should be able to sign out other active sessions where supported by the chosen Supabase Auth capabilities.

## 4. Password recovery

- Use Supabase Auth's password recovery flow; never build a custom password-reset token system.
- Recovery links must use allowlisted redirect destinations and expire according to the provider's supported configuration.
- Responses must not reveal whether an email address is registered.
- A successful password reset should revoke or refresh existing sessions according to the supported Auth behavior.
- Never log reset links, tokens, passwords, or full credential payloads.

## 5. Sessions and devices

- Use the supported Supabase session handling for the selected application runtime.
- Protect cookies with secure attributes appropriate to the production HTTPS deployment, including HttpOnly where server-managed cookies are used, Secure, and an appropriate SameSite policy.
- Do not put access or refresh tokens in URLs, analytics, logs, or browser local storage unless the selected official integration explicitly requires and secures that storage model.
- Refresh sessions only through supported Supabase mechanisms.
- Provide a clear logout action and plan for device/session review and revocation.
- Do not cache authenticated pages or personalized responses in shared Cloudflare caches.

## 6. Authorization and account ownership

- The authenticated Supabase user ID is the identity anchor for account ownership.
- Users may read or update only fields explicitly permitted for their own account.
- Private contact details, safety records, reports, moderation notes, and internal review data must never be exposed through public profile queries.
- Never trust client-submitted role, verification status, subscription entitlement, moderation outcome, or match state.
- Privileged actions must run through trusted server-side code with explicit authorization.
- Every exposed table and storage bucket must have reviewed and tested RLS/storage policies before use.

## 7. Age and policy gates

- JoyHeart must enforce an adult-only minimum age policy; the exact minimum and country-specific requirements require legal/product review before launch.
- Do not allow an unverified or underage account to enter public discovery, like, match, or message.
- Record the policy version accepted and the acceptance timestamp.
- Provide a safe process for reporting suspected underage accounts and promptly restricting access pending review.
- Do not rely solely on a browser checkbox as proof of age.

## 8. Abuse prevention

- Apply rate limits to signup, login, recovery, verification resend, and other sensitive endpoints.
- Add bot and automated-abuse protections where justified by measured risk.
- Use progressive controls rather than permanent lockout that attackers could exploit to deny service to victims.
- Add step-up verification for suspicious account changes and high-risk actions.
- Notify users of important security events such as email changes and password resets.
- Provide account reporting, blocking, and support escalation paths before broad public launch.

## 9. Account changes and deletion

- Require re-authentication or step-up verification for changing email, changing password, and other sensitive account settings.
- Verify a new email address before making it the account's primary contact.
- Provide an account deletion request and explain retention exceptions required for safety, fraud prevention, legal obligations, and dispute handling.
- Deletion must be designed across Auth, profile data, photos, messages, reports, and backups/retention policies; do not promise immediate erasure where legal or safety retention applies.

## 10. Redirects, errors, and observability

- Allowlist authentication callback and post-authentication redirect URLs; reject arbitrary user-supplied destinations.
- Use generic public error messages where detailed errors could enable account enumeration.
- Keep useful security event logs without passwords, tokens, recovery URLs, or unnecessary personal data.
- Restrict access to operational logs and define retention.
- Alert on unusual spikes in authentication failures, verification abuse, and account takeover indicators.

## 11. Testing and release gates

Before enabling real registration or login:
- Verify email confirmation, login, logout, recovery, and session refresh end to end.
- Test expired, reused, malformed, and redirected authentication links.
- Test rate limits and account-enumeration resistance.
- Test RLS with two unrelated user accounts and an unauthenticated client.
- Confirm private profile fields and moderation data cannot be read by other users.
- Confirm Cloudflare caching cannot serve one user's private response to another.
- Confirm secrets are absent from browser bundles, repository history, logs, and build artifacts.
- Review country-specific age, privacy, consumer, and data-retention obligations.

## 12. Decisions still required

- Confirm the exact minimum age and launch-country policy with qualified legal review.
- Confirm the first-release email provider and email templates available through the selected Supabase Auth configuration.
- Decide whether phone verification is deferred or required for selected high-risk actions.
- Define support-assisted account recovery and identity checks.
- Define data-retention periods and the deletion exceptions required by law and safety operations.

## Implementation boundary

This document is a design specification only. It does not create Supabase tables, migrations, RLS policies, Auth settings, storage buckets, Cloudflare secrets, or working registration/login forms. No credentials or personal data are collected by this work.
