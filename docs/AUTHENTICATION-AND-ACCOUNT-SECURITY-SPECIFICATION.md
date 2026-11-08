# JoyHeart authentication and account security specification

## Purpose and scope

Define the secure account lifecycle for JoyHeart before implementing registration, login, password recovery, or live authentication.

This is a design document only. It does not configure Supabase Auth, create database tables, add policies, collect credentials, or enable account registration.

JoyHeart will use the existing Supabase project. Do not create a second Supabase project or a separate staging database.

## Security principles

1. Supabase Auth is the sole owner of passwords, credential verification, and authentication tokens.
2. Never store plaintext passwords, password hashes, access tokens, refresh tokens, recovery tokens, or one-time codes in application tables or logs.
3. Authentication proves identity; server-side authorization decides what that identity may do.
4. Never trust client-supplied role, staff status, verification status, subscription status, account status, or permissions.
5. Use deny-by-default authorization and Row Level Security for every exposed user-owned table.
6. Use generic responses where detailed errors could reveal whether an email or phone number has an account.
7. Apply rate limits and abuse controls to signup, login, verification, recovery, and other sensitive actions.
8. Keep secrets server-side. A Supabase service-role key must never be shipped to a browser or committed to Git.
9. Make account security and recovery understandable to ordinary members.
10. Do not enable live registration until the required legal, age, privacy, and security decisions are approved.

## Account lifecycle

### 1. Registration

Proposed flow:

1. Member opens the Join JoyHeart page.
2. Member reviews the applicable Terms, Privacy Notice, and age eligibility statement.
3. Member provides an email address and a password, or uses another explicitly approved authentication method.
4. The server validates input and applies signup rate limits and abuse checks.
5. Supabase Auth creates the pending account.
6. Supabase sends a verification message using the configured approved method.
7. The account remains unverified and cannot publish a public profile or use member discovery until required verification and eligibility checks pass.
8. After verification, the member completes onboarding and creates a profile.

Requirements:

- Use Supabase Auth; do not implement custom password storage.
- Require explicit acceptance of the current terms and privacy notice and record the applicable policy version and timestamp.
- Do not treat clicking a client-side checkbox as sufficient proof of age.
- Do not expose account existence through different signup error messages.
- Prevent automated signup abuse with server-side rate limits and proportionate bot controls.
- Do not request unnecessary personal information during registration.
- Email verification links must use approved redirect destinations only.
- Verification tokens must be short-lived and single-use according to provider capabilities.

### 2. Login

Proposed flow:

1. Member submits their email and password over HTTPS.
2. Supabase Auth verifies the credentials.
3. The application establishes the authenticated session using secure cookie/session handling appropriate to the chosen architecture.
4. Server-side authorization checks account state before granting access to protected features.
5. The member is redirected only to an approved internal destination.

Requirements:

- Use generic login failure messages that do not reveal whether the email exists.
- Apply rate limits and progressive abuse controls; avoid permanent lockouts that attackers can trigger against another member.
- Never log passwords, tokens, verification codes, or recovery links.
- Do not trust a role or account status supplied in a browser request.
- Require verified email and approved age eligibility before profile publication and discovery. Phone verification is not a universal launch requirement.
- Handle expired, revoked, and invalid sessions safely.

### 3. Email and phone verification policy

**Approved launch policy:** Email verification is required for every new account before the member can publish a profile, enter member discovery, send likes, or use other member-only features. A newly registered account remains pending until the email address is verified.

**Phone verification:** Phone verification is not required for every member at initial signup. It may be introduced later as an additional, proportionate safety check for higher-risk activity, account recovery, suspicious behavior, or sensitive account changes. Any such requirement must have a clear purpose, privacy notice, rate limits, and a safe support/alternative process for members who cannot use the available phone method. Phone numbers must remain private and must never appear on public profiles.

Implementation requirements:

- Use Supabase Auth's supported email verification flow; do not create a separate password or token system.
- Keep the account in a pending/unverified state until Supabase Auth confirms the email address.
- Enforce verification on the server for every protected member action; hiding buttons in the browser is not sufficient.
- A browser must not be able to set its own verified flag.
- Resend actions must be rate-limited.
- Verification links must not allow arbitrary external redirects.
- Changing an email address must require confirmation through the approved secure process.
- Do not expose verification tokens or private contact details to other members.
- If phone verification is later enabled, verification status must come from a trusted provider/server-side record, never a client-submitted flag.
### 4. Password policy and launch login methods

**Recommended launch approach — awaiting product approval:** Start with email address and password as the only sign-in method. Keep passwordless email links and social sign-in out of the first release until their account-linking, recovery, privacy, and abuse implications have been reviewed.

Recommended password rules:

- Require at least 12 characters; allow long passphrases and support at least 64 characters, subject to the configured provider limit.
- Allow spaces and common password-manager-generated passwords.
- Do not require arbitrary mixtures of uppercase, lowercase, numbers, and symbols when length and compromised-password checks provide stronger usability/security balance.
- Reject commonly used or known-compromised passwords where the selected Supabase plan and configuration support this protection; verify the exact availability before enabling it.
- Never truncate passwords silently.
- Permit paste and password managers; provide a show/hide password control.
- Do not force periodic password changes without evidence of compromise or another security reason.
- Apply login rate limits and abuse monitoring; never reveal whether an email address is registered.
- Password changes and recovery must use Supabase Auth's supported flows. JoyHeart must not store password values or hashes.

Login method scope:

- Initial release: email + password, with mandatory email confirmation.
- Later review: passkeys/passwordless and social providers only after account linking, recovery, verified identity, and support behavior are specified and tested.
- Never make a third-party social account's profile data or provider verification a substitute for JoyHeart's own age eligibility and policy checks.

These are recommended settings, not yet an approved final policy. Confirm provider limits and available compromised-password protection in the existing Supabase project before implementation.

### 4. Password recovery

**Approved product policy:** Members recover access through a time-limited recovery link sent to their verified email address. If a member has also lost access to that email account, they may contact JoyHeart support for a carefully verified account-recovery review. Support must never retrieve, view, or set a member's existing password, and must not bypass identity checks or account restrictions.

Approved flow:

1. Member requests account recovery using their email address.
2. JoyHeart returns a generic acknowledgement regardless of whether an account exists.
3. Supabase Auth sends a time-limited recovery link when appropriate.
4. The link is accepted only for an approved redirect destination and is single-use.
5. The member completes the password change through the trusted Auth flow.
6. Existing sessions are revoked using the approved session policy and supported provider behavior.
7. The member receives a security notification that recovery or password change occurred.
8. If the member cannot access their verified email, they may contact support. Support follows a documented identity-verification process, records the decision, and escalates uncertain or high-risk cases rather than bypassing safeguards.

Requirements:

- Never email or display an existing password.
- Never ask staff to retrieve or set a member's password.
- Rate-limit recovery requests and prevent token reuse.
- Do not disclose account existence through response text, timing, or detailed errors.
- Support identity checks must use proportionate evidence, protect submitted documents/data, restrict staff access, and be documented before launch.
- Do not use public profile details, social media messages, or easily discovered personal facts as sole proof of account ownership.
- Notify the member of recovery and credential changes through available trusted contact channels.
- Recovery support must not bypass identity checks, age/eligibility restrictions, account suspensions, or moderation decisions.
- Verify the selected Supabase Auth recovery and session-revocation capabilities before implementation.

### 5. Session management and logout

**Approved product policy:** Keep members signed in on their own trusted devices, with an inactivity expiry after 30 days. Members must be able to log out of the current device and request logout from all devices. Revoke sessions after password recovery, suspected account compromise, and account deletion. Require the member to authenticate again before sensitive account actions.

Implementation requirements:

- Use secure, HTTP-only, appropriately SameSite cookies where the application architecture supports them.
- Set Secure cookies in production and protect state-changing requests against CSRF where cookie-based sessions are used.
- Do not place long-lived session tokens in local storage.
- Rotate or refresh sessions using the Supabase-supported secure flow.
- Provide logout on the current device.
- Provide a way for members to sign out of all devices; verify the chosen Supabase session-revocation behavior before implementation.
- Enforce the 30-day inactivity expiry server-side using supported session controls; do not rely only on a browser timer.
- Revoke sessions after password recovery, suspected account compromise, and account deletion, using supported provider behavior.
- Require recent authentication or an approved step-up check before sensitive account actions.
- Handle session expiry without exposing private data or creating redirect loops.
- Do not claim device-level session lists or per-device revocation until implemented and tested.

### 6. Account deletion and deactivation

**Approved product policy:**

- Members can request permanent account deletion.
- Require secure identity confirmation, such as recent authentication or an approved step-up check, before processing the destructive action.
- Hide the member's profile from discovery immediately when the deletion request is accepted for processing.
- Before final confirmation, clearly explain what happens to profile information, photos, matches, and message history.
- Retain only records that are legitimately required for safety, fraud prevention, or legal reasons. Any retained records must have restricted access and a defined retention period.
- Delete or anonymize other personal data according to the approved retention schedule and applicable law.

Implementation requirements:

- Deletion must be performed by trusted server-side logic, not by trusting a client-supplied user ID.
- Confirm the request and explain its consequences before the final irreversible step.
- Define and publish retention periods and the treatment of messages, matches, reports, and safety records before launch.
- Define a recovery/cancellation window only if the product and legal policy explicitly support it.
- Keep deletion actions auditable without retaining unnecessary personal information.
- Ensure profile removal from discovery and public caches is handled promptly and safely.

## Authorization and access control

Authentication alone must not grant access to another member's information.

- Enable Row Level Security on every exposed application table.
- Use explicit owner and participant checks for private profiles, preferences, photos, likes, matches, conversations, and messages.
- A member can update only permitted fields belonging to their own account.
- Staff access must use trusted server-side roles and narrowly scoped permissions.
- Never use a public profile field or user-editable metadata as an authorization source.
- Service-role credentials are server-only and must be used only for narrowly scoped trusted operations.
- Every server action must independently validate the authenticated user and requested resource.
- Blocked, suspended, unverified, and underage/ineligible accounts must be prevented from using restricted features even if they possess a valid session.

## Age eligibility and policy acceptance

**Proposed minimum age: 18 years.** This is the approved product proposal for JoyHeart, subject to country-specific legal review before launch. If a launch country's law requires a higher minimum age or additional age-assurance measures, JoyHeart must follow those requirements. Do not launch in a country until its applicable requirements have been reviewed.

Before enabling registration:

- Confirm the proposed 18-year minimum age is lawful in each launch country; apply any higher local minimum or additional age-assurance requirement.
- Review age and online dating requirements in each launch country.
- Decide whether date-of-birth declaration is sufficient at signup and where additional age assurance is required.
- Keep exact date of birth private and derive any displayed age through trusted server-side logic.
- Prevent an ineligible account from publishing a profile or entering discovery.
- Define a fair review and appeal process for eligibility restrictions.
- Record terms/privacy policy version, acceptance time, and relevant consent state.
- Obtain legal review for country-specific notices, consent, retention, and deletion.

Do not launch in a country until its applicable requirements have been reviewed.

## Abuse prevention and security monitoring

Apply proportionate controls to:

- Signup and repeated account creation.
- Login failures and credential-stuffing patterns.
- Verification resend and token redemption.
- Password recovery.
- Email/phone changes.
- Session refresh and suspicious session activity.
- Profile publication and account deletion.
- Staff access and privileged actions.

Monitoring requirements:

- Record security events without storing passwords, tokens, recovery URLs, or unnecessary personal content.
- Restrict access to security logs.
- Define alert thresholds and incident response ownership before launch.
- Avoid revealing detailed risk rules to attackers.
- Provide a member-facing path to report suspected account compromise.

## Redirects, cookies, and browser security

- Maintain an explicit allowlist for post-login, verification, and recovery redirect destinations.
- Reject arbitrary external redirect URLs.
- Use HTTPS throughout production.
- Configure cookie domain, Secure, HttpOnly, and SameSite attributes for the deployed domain and application architecture.
- Protect cookie-authenticated state-changing requests against CSRF.
- Apply an appropriate Content Security Policy and other security headers after testing compatibility with the app.
- Do not expose secrets in client bundles, HTML, source maps, analytics, or error responses.
- Avoid caching authenticated pages and personalized responses in shared public caches.

## Multi-factor authentication (MFA)

**Approved product policy:**

- Members: MFA is optional at launch.
- Staff and administrators: MFA is required before accessing the administration system.
- Require additional verification for sensitive actions where appropriate.
- Provide a secure, documented recovery process if a member or staff user loses access to their MFA device.

Implementation requirements:

- Verify the MFA factors and enrollment/challenge capabilities supported by the selected Supabase Auth configuration before implementation.
- Enforce the staff/admin MFA requirement server-side; hiding administration screens in the browser is not sufficient.
- Do not trust client-supplied role or MFA status.
- Do not allow support staff to silently bypass MFA.
- Define identity checks, escalation, audit logging, and restricted permissions for MFA recovery.
- Test enrollment, challenge, recovery, revocation, session behavior, and enforcement for staff/admin routes before launch.

## Required validation before launch

Tests must demonstrate that:

- Unauthenticated visitors cannot access protected account or member data.
- One authenticated member cannot read or modify another member's private data.
- A member cannot assign themselves staff, moderator, verified, premium, or other privileged status.
- Unverified or ineligible accounts cannot publish profiles or enter discovery.
- Recovery and login responses do not disclose account existence.
- Rate limits apply to sensitive authentication actions.
- Redirect allowlists reject untrusted destinations.
- Session expiry and revocation behave safely.
- Cookie and CSRF protections work in the deployed Cloudflare environment.
- Account deletion follows the approved retention and anonymization policy.
- Secrets and credentials never appear in client code or logs.
- RLS policies and server-side authorization are tested with multiple distinct users.

## Production email delivery and sender security

**Approved product policy:** JoyHeart will use a dedicated email delivery provider for account verification, password recovery, and security notifications. Emails will use a JoyHeart-branded sender identity and an authenticated sending domain.

Implementation requirements:

- Select a provider after reviewing deliverability, security, pricing, regional/privacy considerations, and compatibility with Supabase Auth.
- Use a JoyHeart-controlled sender address and domain; do not invent or configure a sender address before the domain is owned and verified.
- Configure and validate SPF, DKIM, and DMARC for the sending domain.
- Monitor delivery, bounces, complaints, and provider errors; define a process to respond to delivery failures.
- Keep provider API keys and SMTP credentials in approved server-side secrets only. Never expose them in browser code or commit them to Git.
- Use approved, allowlisted links for verification and recovery. Links must be time-limited and single-use where supported.
- Never include passwords, raw authentication tokens, or unnecessary sensitive personal information in email content or logs.
- Test email templates, sender authentication, delivery, bounce handling, and recovery/verification links before enabling public registration.
- Do not send marketing messages as part of transactional authentication email without separate consent and legal review.

## Account security notifications

**Approved product policy:** Notify members when their password changes, their email address changes, or their account security settings change.

Implementation requirements:

- Send notifications through the configured transactional email provider.
- For an email-address change, notify the previously verified email address where it remains deliverable, and send the required confirmation to the new address before treating it as verified.
- Do not include passwords, raw authentication tokens, or unnecessary sensitive information in notifications.
- Include the event type, approximate time, and a clear instruction to contact JoyHeart support promptly if the member did not make the change.
- Do not include an unsafe one-click action that could allow an attacker to reverse or take over an account.
- Record notification delivery outcomes without logging secrets or unnecessary personal content.
- Define handling for bounced or undeliverable security notifications before launch.
- Test notifications for password changes, email changes, and security-setting changes before enabling public registration.

## New-device login security notifications

**Approved product policy:** Notify members when a successful login is detected from a new or unrecognised device.

Implementation requirements:

- Send the alert through the configured transactional email provider to the member's verified email address.
- Include the login time and only the device or session details that are useful and safe to disclose.
- Provide clear instructions for contacting JoyHeart support and securing the account if the member does not recognise the login.
- Do not include passwords, raw authentication tokens, or sensitive session secrets in the alert.
- Define what qualifies as a new or unrecognised device using signals the authentication provider can reliably supply; do not claim precise device identification or location when it is not available.
- Avoid exposing whether an email address has an account through login or alert responses.
- Rate-limit and monitor alerts to prevent abuse and excessive notifications.
- Test detection, delivery, and the suspicious-login support path before public launch.

## Member-visible active session management

**Approved product policy:** Members will be able to view and manage their active login sessions from their account security page.

Implementation requirements:

- Show only session information that the authentication provider reliably exposes, such as device/browser summary, approximate last activity, and session status.
- Allow a member to end an individual session where the provider supports reliable session-level revocation.
- Provide a clear option to sign out of all other sessions, while preserving the current session only when the provider can safely guarantee that behavior.
- Keep the existing current-device logout control available.
- Require recent authentication or another approved step-up check before sensitive session-management actions.
- Enforce session ownership and revocation server-side; never trust a client-supplied user ID or session ownership claim.
- Do not display raw session tokens, secrets, or unnecessarily precise location data.
- If the provider cannot support reliable per-session listing or revocation, do not simulate those capabilities; clearly limit the interface to the controls that are genuinely supported.
- Verify provider capabilities and test cross-account isolation, revocation, and logout behavior before launch.

## Protection against repeated failed login attempts

**Approved product policy:** JoyHeart will apply temporary protective restrictions after repeated failed login attempts to reduce password-guessing and account-compromise risk.

Implementation requirements:

- Use server-side rate limits and risk controls; never rely on client-side counters.
- Apply progressive delays or temporary throttling before considering a temporary account-level lock, where supported and safe.
- Define thresholds, lock duration, reset behavior, and escalation rules using security testing and abuse monitoring before launch; do not hard-code unreviewed thresholds in this policy.
- Avoid permanent lockouts from login failures alone. Provide a safe recovery path through the verified account-recovery process.
- Keep login and recovery responses generic so attackers cannot use them to determine whether an account exists.
- Apply protections across relevant signals (such as account and network/device risk) without allowing one shared network to trivially deny service to many members.
- Log security events with minimal necessary information; never log passwords, raw tokens, or other authentication secrets.
- Notify members when suspicious repeated attempts create a meaningful security event, where safe and deliverable.
- Test rate-limit bypasses, distributed attempts, false positives, account enumeration, and recovery behavior before launch.
- Verify Supabase Auth and any server-side rate-limiting capabilities before selecting the implementation; do not claim account lockout is active until implemented and tested.

## Re-authentication before changing the account email address

**Approved product policy:** Before a member changes the email address on their JoyHeart account, require confirmation through the member's currently verified email address, in addition to any required recent-authentication or step-up check.

Implementation requirements:

- Send a time-limited, single-use confirmation link or code to the currently verified email address; use only a method supported and securely configured by the authentication provider.
- Do not apply the new email address as verified until the required confirmation of the change has succeeded.
- Verify the new email address before treating it as the account's verified contact address.
- Notify the previous verified address about the attempted or completed change where it remains deliverable, and notify the new address as appropriate.
- Keep the current verified email unchanged if confirmation fails or expires.
- Apply rate limits and generic responses to prevent account enumeration and abuse.
- Do not reveal passwords, raw tokens, or unnecessary personal information in messages or logs.
- Define a safe support route for members who have lost access to their current verified email; support must follow the approved identity-verification process and must not bypass security controls.
- Verify Supabase Auth email-change behavior and test expiry, replay, failed confirmation, notification delivery, and recovery before launch.

## Re-authentication for sensitive profile changes

**Approved product policy:** Require members to confirm their identity again before changing sensitive profile information, including their date of birth and other important account details.

Implementation requirements:

- Require recent authentication or an appropriate step-up verification before accepting a sensitive change.
- Define the sensitive-field list and the verification level for each field before implementation; do not treat every ordinary profile edit as a high-risk action.
- Enforce authorization and validation server-side. Never trust a client-supplied user ID, role, or verification status.
- Record security-relevant changes in an appropriately protected audit trail, with minimal necessary data and no passwords, raw tokens, or unnecessary sensitive values.
- Notify the member when high-impact account details change, where a safe and deliverable notification channel exists.
- Apply appropriate abuse controls and prevent changes that would violate minimum-age or other eligibility requirements.
- Define a careful support and correction process for legitimate mistakes, including incorrect date-of-birth entries; support must not bypass identity, age, or moderation controls.
- Verify provider capabilities and test step-up verification, authorization, audit logging, notifications, and failed/expired verification before launch.

## Notifications for sensitive profile changes

**Approved product policy:** Notify members when sensitive profile information, including date of birth or other important account details, is changed.

Implementation requirements:

- Send a security notification to the member's verified email address, or another approved and verified notification channel where available.
- Identify the category of information changed and the approximate time, without unnecessarily repeating sensitive values such as the full date of birth.
- Explain how to contact JoyHeart support promptly if the member did not make the change.
- Do not include passwords, raw authentication tokens, or unnecessary sensitive personal information in notifications or logs.
- Trigger notifications from trusted server-side change events, not client claims.
- Avoid sending duplicate or excessive alerts; monitor delivery failures and define safe retry behavior.
- Test notification delivery, event coverage, privacy, and failure handling before launch.

## Member access to a personal data export

**Approved product policy:** Members will be able to request and download a copy of their personal data and profile information.

Implementation requirements:

- Provide an authenticated, member-initiated export process with recent-authentication or step-up verification before release.
- Generate the export server-side and restrict it to the requesting member's own data; never trust a client-supplied user ID or authorization claim.
- Define and document the export contents before launch, including profile information and other personal data the member is entitled to receive.
- Exclude passwords, authentication secrets, raw session tokens, internal security controls, and other members' private information.
- Carefully assess shared content such as messages, reports, and moderation records so the export does not improperly disclose another person's personal information or compromise safety investigations.
- Use a secure, time-limited download link or equivalent authenticated delivery method; do not send the export as an ordinary email attachment.
- Protect generated files with access controls and encryption, avoid logging their contents, and automatically expire and delete temporary export files after a defined short retention period.
- Apply rate limits, prevent duplicate or abusive export requests, and provide clear status and failure handling.
- Define processing times, file format, supported data categories, retention, and applicable legal exceptions before launch, consistent with the laws of each launch country.
- Test authorization, cross-account isolation, completeness, secure delivery, expiry, and deletion of temporary files before public launch.

## Temporary account deactivation

**Approved product policy:** Members may temporarily deactivate their JoyHeart accounts without permanently deleting them.

Implementation requirements:

- Require the member to be authenticated and confirm the deactivation request.
- Hide the deactivated member's profile from discovery and prevent new member interactions while deactivation is active.
- Preserve account data securely so the member can reactivate the account, subject to applicable safety, legal, and moderation restrictions.
- Define how existing matches, conversations, messages, subscriptions, and pending interactions behave during deactivation; explain this clearly before confirmation.
- Do not treat deactivation as permanent deletion or as a way to erase safety records, reports, or valid legal-retention obligations.
- Provide a secure reactivation process and verify the member's identity before restoring account access and visibility.
- Notify the member that deactivation has taken effect, using a verified channel where available.
- Test discovery exclusion, access restrictions, reactivation, and interactions with account deletion and moderation before launch.

## Birthday and holiday greetings

**Approved product policy:** JoyHeart will send members birthday greetings and greetings on relevant holidays.

Implementation requirements:

- Birthday greetings must use the member's stored date of birth only for the intended greeting; never disclose the full date of birth in the greeting or to other members.
- Determine relevant holidays using a clearly defined locale, such as the member's chosen country or region, and maintain a reviewed holiday calendar. Do not assume a holiday is celebrated by every member.
- Give members clear controls to opt out of birthday and holiday greetings independently, and respect notification preferences and applicable consent requirements.
- Distinguish these greetings from marketing messages; do not include promotions or advertising without separate consent and legal review.
- Use the approved transactional/notification delivery provider once selected and configured; do not claim delivery is live before setup and testing.
- Avoid excessive notifications, respect local dates and time zones where known, and do not send a greeting when the relevant date or locale is uncertain.
- Keep personal details private, use minimal data in logs, and test scheduling, opt-outs, locale handling, and delivery failures before launch.

## Member control of online status and last-active visibility

**Approved product policy:** Members will be able to control who can see their online status and last-active time.

Implementation requirements:

- Provide clear privacy controls to hide or show online status and last-active information, with understandable descriptions of each setting.
- Default to the more privacy-protective setting unless a different default is explicitly approved after product and legal review.
- Apply visibility rules consistently across discovery, profiles, matches, and other places where presence information may appear.
- Do not expose precise activity timestamps when a broader or hidden status is selected.
- Do not let a member's privacy setting reveal whether another member is online through indirect UI or API behavior.
- Enforce visibility permissions server-side; do not rely only on hiding interface elements.
- Define how blocking, account deactivation, staff access, and safety investigations interact with presence visibility.
- Test privacy settings, API responses, cross-account access, and changes to settings before launch.

## Member control over who can send messages

**Approved product policy:** Members will be able to control who can send them messages, with options for everyone, matches only, or nobody.

Implementation requirements:

- Provide clear, accessible controls for the three approved choices: everyone, matches only, and nobody.
- Explain how each choice affects new conversations and existing conversations before the member saves a change.
- Apply messaging eligibility and privacy rules server-side for every message and conversation-creation request; never rely only on hiding buttons in the interface.
- Ensure the nobody setting prevents new incoming messages while clearly defining whether existing conversations remain readable and whether members can reply.
- Respect blocks, reports, suspensions, account deactivation, and other safety restrictions regardless of the selected messaging preference.
- Do not let a sender infer private account details from message rejection responses; use safe, consistent responses.
- Allow members to change their preference at any time, subject to safety and moderation restrictions.
- Test all preference combinations, existing-conversation behavior, blocked accounts, unauthorized API requests, and cross-account isolation before launch.

## Member control over photo visibility

**Approved product policy:** Members will be able to control who can see their profile photos, with options for everyone, matches only, or selected people.

Implementation requirements:

- Provide clear, understandable controls for the three approved choices: everyone, matches only, and selected people.
- Define how selected-person access is granted, reviewed, and revoked; do not expose private photos through guessable URLs or client-side-only checks.
- Enforce photo visibility server-side for every image request and any generated thumbnail or alternate image size.
- Keep private photo storage and delivery protected with authorization checks; use short-lived access links where appropriate.
- Explain how photo visibility interacts with discovery, likes, matches, messaging, blocking, reporting, account deactivation, and moderation before members save a change.
- Ensure blocked members and suspended or otherwise restricted accounts cannot bypass photo visibility rules.
- Do not let unauthorized viewers infer whether a private photo exists through API responses, metadata, or predictable file paths.
- Provide members with a clear way to review and revoke selected-person access.
- Test authorization, link expiry, thumbnail protection, cross-account access, revocation, and privacy behavior before launch.

## Member control over country-based discovery and matching

**Approved product policy:** Members will be able to exclude specific countries from seeing their profiles and choose the countries from which they want to receive potential matches.

Implementation requirements:

- Provide separate, clearly explained controls for (a) countries from which the member's profile should be hidden and (b) countries from which the member wants to discover or receive potential matches.
- Allow members to select multiple countries and update their choices at any time.
- Apply country restrictions consistently to discovery, recommendations, likes, profile views, and other relevant entry points; do not rely only on hiding cards in the interface.
- Enforce eligibility and country restrictions server-side for every relevant query and interaction.
- Define the source and reliability of a member's country/region signal, including how travel, VPN use, inaccurate location data, and missing location information are handled. Do not promise precise geographic blocking where the system cannot reliably establish a viewer's country.
- Do not expose a member's private location or reveal whether their profile exists in a restricted country.
- Respect blocks, reports, suspensions, account deactivation, and all other safety restrictions regardless of country preferences.
- Explain that country preferences affect discovery and matching, not legal availability or a guarantee that every selected country will produce matches.
- Test multiple-country selections, cross-country discovery, location uncertainty, API bypass attempts, and interactions with other privacy controls before launch.

## Member language preferences for discovery and matching

**Approved product policy:** Members will be able to select their preferred languages and choose to receive potential matches only from people who speak at least one of those languages.

Implementation requirements:

- Allow members to select multiple languages and update their preferences at any time.
- Distinguish languages a member speaks from languages they are learning or would like to practise; only languages marked as spoken should qualify for a strict spoken-language matching filter unless the member chooses otherwise.
- Provide a clear choice between requiring a language match and using language as a ranking preference, so members understand whether non-matching profiles are excluded or simply ranked lower.
- Apply strict language eligibility consistently in discovery, recommendations, likes, and matching when the member enables the strict filter.
- Enforce matching rules server-side; do not rely only on client-side filtering.
- Use a maintained language catalogue with stable identifiers and support regional variants where useful, without assuming that dialects are interchangeable.
- Avoid exposing private language-learning or profile information beyond the member's visibility settings.
- Explain that language preferences do not guarantee fluency or compatibility; member-entered language levels should be clearly labelled as self-reported unless independently verified.
- Test multiple-language selections, strict versus preference mode, missing language data, and cross-account authorization before launch.

## Relationship intentions and compatibility preferences

**Approved product policy:** Members can state their relationship intentions and choose to have JoyHeart prioritise or strictly filter potential matches by compatible intentions.

Implementation requirements:

- Offer clear, respectful options such as serious relationship, marriage, friendship, and casual dating, with concise explanations so members understand each choice.
- Allow members to select more than one intention where appropriate and update their choices at any time.
- Let members choose whether intention compatibility is a strict matching requirement or a ranking preference. Explain that strict filtering can reduce the number of profiles shown.
- Apply any strict intention filter consistently across discovery, recommendations, likes, and matching, with server-side enforcement.
- Do not assume that two different intentions are compatible. Define and review the compatibility rules before implementation, and show members how their selected intentions affect matching.
- Keep intentions under member control and apply profile visibility/privacy settings consistently.
- Do not infer a member's intentions from photos, messages, age, gender, location, or other profile attributes.
- Provide neutral language, avoid shaming or ranking relationship choices, and review translations for cultural clarity.
- Test multiple selections, strict versus preference mode, changed preferences, missing intention data, and authorization boundaries before launch.

## Decisions required before implementation

The following are deliberately not decided by this specification:

1. Country-by-country legal confirmation of the proposed 18-year minimum age and any stricter eligibility rules.
2. Conditions and safeguards for any future risk-based phone verification; email verification is mandatory at launch.
3. Approval of the recommended 12-character minimum and email/password-only launch; whether passwordless or social login is deferred.
4. Session policy is approved: 30-day inactivity expiry, current-device logout, logout from all devices, session revocation after password recovery/ suspected compromise/account deletion, and re-authentication for sensitive actions. Provider capabilities must be verified before implementation.
5. Recovery policy is approved: verified-email recovery link, plus a documented and carefully verified support route if the member loses access to that email. Support must never retrieve or set passwords or bypass safeguards.
6. Account deletion behavior is approved: secure member-initiated permanent deletion, immediate removal from discovery, clear explanation of effects on matches/messages, and retention only for legitimate safety, fraud-prevention, or legal reasons. Exact retention periods and treatment of messages/reports must still be defined before launch.
7. MFA policy is approved: optional for members at launch and mandatory for staff/administrators before admin access; secure lost-device recovery and server-side enforcement must be implemented and tested.
8. Email delivery policy is approved: dedicated provider, JoyHeart-branded sender, authenticated sending domain (SPF/DKIM/DMARC), and delivery/bounce monitoring. The provider and sender domain still need to be selected and verified before implementation.
9. Account security notifications are approved for password changes, email-address changes, and account security-setting changes. Notification templates, delivery-failure handling, and event coverage must be tested before launch.
10. Exact legal notices, consent wording, and launch-country approvals.

These decisions must be reviewed before the live authentication implementation begins.

## Implementation boundary

When approved, implementation should proceed in small reviewed steps:

1. Review Supabase Auth settings, mandatory email confirmation, email templates, and production redirect configuration.
2. Implement server-side session handling and safe public auth routes.
3. Configure and test the approved password length/strength controls, then implement signup, verification, login, and logout.
4. Implement recovery and session revocation behavior.
5. Implement age eligibility and policy acceptance gates.
6. Add account deletion and security notifications.
7. Validate RLS and authorization with multiple test accounts.
8. Conduct a production security review before enabling public registration.

Do not create application tables or migrations as part of the specification-only step.

## Current status

**Design specification only — the proposed 18-year minimum age is approved as a product decision, subject to country-specific legal review. Authentication is not implemented and is not approved for live launch.** No Supabase Auth settings, database schema, migrations, credentials, account forms, or production user data have been changed by this document.
