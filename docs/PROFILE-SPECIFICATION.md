# JoyHeart member profile specification

## Purpose

Define the first member-facing profile and privacy experience before implementing database migrations or registration forms.

This is a product specification, not a database migration. It creates no tables and collects no member information.

## Profile structure

### 1. Public discovery profile

These fields may appear to eligible members in discovery, subject to the member's visibility settings and safety rules.

| Field | Required | Privacy and validation |
| --- | --- | --- |
| Display name | Yes | First name or chosen display name; never require a legal name for public display |
| Date of birth | Yes, private input | Used to calculate age and enforce eligibility; exact date is never shown publicly |
| Age | Derived | Display age only; calculate from date of birth using the member's local date policy |
| Profile photos | At least one before discovery | Private storage by default; show only approved photos |
| Country | Yes | Publicly selectable country |
| Region / state | Optional | Member-controlled visibility |
| City | Optional | City-level only; never exact home address |
| About me | Optional | Plain text, length-limited, moderated |
| Interests | Optional | Selected from a controlled catalogue plus reviewed additions |
| Relationship intention | Yes | Examples: long-term relationship, marriage-minded, life partner, friendship first |
| Languages | Optional | Selected from a controlled catalogue |
| Education | Optional | Optional, member-controlled |
| Occupation | Optional | Broad occupation or industry; no employer contact details |
| Lifestyle prompts | Optional | Structured prompts that help people understand values and compatibility |

### 2. Private account and safety information

Never shown in public discovery or to another member.

- Authentication email and phone verification state.
- Exact date of birth.
- Account recovery and security settings.
- Account status and risk flags.
- Privacy preferences.
- Consent and policy acceptance records.
- Internal support and moderation metadata.

Credentials remain with Supabase Auth. Do not store plaintext passwords.

### 3. Discovery preferences

Visible only to the member and trusted matching logic.

- Preferred age range, subject to platform minimum-age rules.
- Preferred countries or regions.
- Distance preference, if location-based discovery is enabled.
- Preferred languages.
- Relationship intentions.
- Gender or people-to-meet preferences, collected only where necessary and with careful privacy controls.
- Optional lifestyle and interest preferences.
- Discovery visibility toggle.

Sensitive preference data must not be exposed through public profile queries or analytics.

## Privacy levels

| Level | Examples | Access |
| --- | --- | --- |
| Public-to-members | Approved display name, age, approved photos, selected interests, city/country, bio | Eligible signed-in members in discovery |
| Match-only | Optional expanded profile details selected by the member | Current match participants only |
| Private-to-owner | Exact date of birth, email, phone, discovery preferences, privacy settings | The account owner |
| Restricted staff | Reports, verification evidence, internal moderation notes, risk signals | Specifically authorized staff through server-side tools only |

The product must never offer a setting that makes identity documents, private contact details, or internal moderation records public.

## Profile creation flow

1. Create account and verify the required contact method.
2. Confirm age eligibility and accept required terms and privacy notices.
3. Choose a display name and add basic profile details.
4. Add at least one photo and submit it for moderation.
5. Select relationship intention, interests, and languages.
6. Set discovery preferences and profile visibility.
7. Preview the public profile before publishing.
8. Publish only after required fields and safety checks pass.

Do not publish incomplete profiles automatically. A member must understand which fields are visible before publishing.

## Member controls

Members should be able to:

- Preview their profile as another member sees it.
- Edit or remove optional profile fields.
- Change discovery visibility and pause discovery.
- Remove or replace profile photos.
- Block another member.
- Report a profile or message.
- Request account deletion and access to their personal data.
- Control optional notifications and contact preferences.

## Age and eligibility safeguards

- Define the minimum age and country-specific eligibility rules before account creation is enabled.
- Reject underage registration before profile publication.
- Do not rely on a public age field supplied by the browser.
- Store the date of birth privately and derive the displayed age on trusted server-side logic.
- Establish a review and appeal process for age-related account restrictions.
- Do not launch in a country until applicable legal and privacy requirements have been reviewed.

## Location safeguards

- Ask for country and optionally region/city rather than exact address.
- Do not expose precise coordinates in profile responses.
- If distance-based matching is later introduced, use coarse location or server-side distance calculations and never return another member's exact coordinates.
- Make location permission optional and explain its purpose before requesting it.

## Photo safeguards

- Keep uploaded originals in private storage.
- Validate file type, size, and content on trusted server-side processing.
- Strip EXIF metadata, especially GPS coordinates, before any image is served.
- Require moderation approval before a photo is visible in discovery.
- Support reporting and removal of abusive or non-consensual imagery.
- Do not use profile photos for face recognition or biometric identification without a separately reviewed legal basis and explicit consent.

## Accessibility and inclusion

- Use clear labels and simple language.
- Support keyboard navigation and screen readers.
- Do not force members to disclose optional sensitive information.
- Provide inclusive preference choices and explain how each affects discovery.
- Avoid implying that profile completeness determines a person's worth or attractiveness.

## Decisions required before implementation

The following product decisions are now confirmed:

1. **Minimum age: 18+.** Registration and discovery must reject anyone under 18. Any higher country-specific legal minimum takes precedence.
2. **Date of birth is private.** Collect it during registration, store it outside public profile data, and never expose the exact date to other members.
3. **Displayed age is derived.** Calculate age from the privately stored date of birth using trusted server-side logic; never accept a client-supplied age as authoritative.
4. **Email verification is required before member discovery access.** Phone verification is not required for the initial signup flow unless a later risk or legal review changes this.

The following product details still need decisions before their implementation: optional profile fields at launch; city/region display defaults; match-only expanded fields; final relationship-intention and preference catalogues; photo moderation and appeals; and data-retention/account-deletion periods.

## Status

**Product policy updated — 18+ confirmed, exact date of birth private, and age server-derived.** The profile form, database migration, profile APIs, and public member profile are not yet implemented.
