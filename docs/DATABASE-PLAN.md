# JoyHeart database design — review before migration

## Purpose

This document defines the first database boundary for JoyHeart. It is a design document only: it does not create tables, policies, buckets, users, or migrations.

The database will use the existing JoyHeart Supabase project. Do not create a second project or a staging database.

## Design principles

1. Supabase Auth owns credentials. Never store plaintext passwords in application tables.
2. Every user-owned record has an authenticated owner and explicit access rules.
3. Public discovery data is deliberately separated from private account and safety data.
4. A match is created only after two eligible members express mutual interest.
5. A conversation is available only to its matched participants, subject to blocking and moderation restrictions.
6. Blocking and reporting must work even when a member is not matched with the reported person.
7. Administrative access is granted through trusted server-side authorization, never a user-editable profile field.
8. Private, personalized, and messaging responses must not use shared public caching.

## Proposed data areas

| Area | Proposed records | Purpose |
| --- | --- | --- |
| Identity | `profiles`, `profile_private` | Public-facing member profile and separately protected private details |
| Preferences | `discovery_preferences` | Age range, distance, relationship intentions, and discovery filters |
| Media | Supabase Storage objects and `profile_photos` metadata | Profile photo ownership, ordering, moderation state |
| Discovery | `likes`, `passes` | Member interest signals; never expose another member's private actions |
| Matching | `matches` | A single record for a mutual match |
| Messaging | `conversations`, `conversation_members`, `messages` | Private conversations limited to their participants |
| Safety | `blocks`, `reports`, `moderation_actions` | Blocking, reports, review outcomes, and enforcement history |
| Verification | `verification_requests` | Verification workflow and restricted evidence references |
| Billing | `subscriptions`, `entitlements` | Paid plan state and feature access, reconciled from trusted payment events |

## Initial table boundaries

### profiles

Contains only fields that a member may intentionally show in discovery: display name, server-derived age (not date of birth), short biography, country, region, city-level location, interests, relationship intention, approved-photo references, and profile publication state. Never put the exact date of birth in this table or expose it through discovery queries.

Do not store exact home address, identity-document numbers, private contact details, or precise live coordinates here.

### profile_private

Contains restricted account and privacy settings, including the exact date of birth and account lifecycle details. The date of birth must be written only by trusted signup logic after the server-side 18+ check. Do not expose it through public profile queries or ordinary discovery APIs. Any owner-facing read or correction flow must be explicitly designed and audited; do not create broad client write access to date of birth.

### discovery_preferences

Contains the member's own discovery settings. A member can read and update only their own preferences. Matching logic must apply privacy, age, block, visibility, and eligibility rules before returning candidates.

### profile_photos

Stores metadata only: owner, private storage object path, display order, moderation status, and timestamps. Original uploads should be private by default. A trusted image-delivery path may serve only approved images.

### likes and passes

A member may create and remove their own interest signals. Members must not be able to list other people's outgoing likes or passes. Duplicate active likes should be prevented by a database uniqueness rule.

### matches

Created only by trusted matching logic after reciprocal eligible likes. Both participants may read their match. Neither participant may directly insert or alter match state through an unrestricted client write.

### conversations, conversation_members, messages

A conversation is tied to a valid match. Only its active participants may read it or send messages. Message creation must verify that the sender is the authenticated participant and that neither participant has blocked the other or been restricted by moderation. Message edits/deletes need a separately defined retention and abuse-review policy.

### blocks and reports

A member may create a block or report for another member. Blocking must immediately prevent discovery, new likes, and messaging in either direction. Report details and evidence are private to the reporter and authorized moderation staff; the reported member must not read the report.

### verification_requests and moderation_actions

Evidence references, reviewer notes, internal decisions, and enforcement details are restricted to trusted server-side staff workflows. Never expose identity documents or moderation notes in public profile queries.

### subscriptions and entitlements

Payment-provider events must be verified server-side. Members may read their own plan and entitlements but cannot grant themselves paid access by editing database rows.

## Row Level Security policy matrix

| Data | Member read | Member write | Other members |
| --- | --- | --- | --- |
| Published profile fields | Own and eligible discoverable profiles | Own fields only | Approved discovery fields only |
| Private profile | Own only | Own permitted settings only | No access |
| Discovery preferences | Own only | Own only | No access |
| Photo metadata | Own and approved visible photos | Own uploads/order requests | Approved photos only |
| Likes and passes | Own signals only | Own signals only | No access to outgoing signals |
| Matches | Both participants | No direct state changes | No access |
| Conversations | Active participants | No direct membership changes | No access |
| Messages | Conversation participants | Send as self, subject to checks | No access |
| Blocks | Own block list | Create/remove own blocks | No access |
| Reports | Reporter may see own submitted status | Submit report only | No access to report content |
| Verification evidence | No general member access | Submit through restricted workflow | No access |
| Moderation actions | No access to internal records | No direct writes | No access |
| Subscription/entitlements | Own summary | No direct privilege changes | No access |

## Required safeguards before the first migration

- Enable RLS on every exposed table.
- Add explicit policies for SELECT, INSERT, UPDATE, and DELETE; absence of a policy must mean no access.
- Use database constraints for ownership, uniqueness, valid states, and match relationships.
- Keep service-role credentials server-only.
- Do not trust user-supplied role, verification, subscription, moderation, or match-status fields.
- Add tests proving a second authenticated user cannot read or modify another user's private data, messages, reports, or evidence.
- Add tests proving blocks prevent discovery and messaging.
- Define data retention, account deletion, photo removal, and report-evidence handling before launch.
- Enforce the platform minimum age of 18 in trusted database/server-side signup logic; apply a higher local legal minimum where required.
- Store exact date of birth only in restricted private data; derive displayed age server-side.
- Review location precision and age eligibility requirements for every operating country before enabling discovery.

## Decisions still required before migration

- Country-specific rules that may require a minimum age higher than 18.
- Whether discovery is global by default or country/region based.
- Which profile fields are public, match-only, or private.
- Photo moderation and verification requirements.
- Whether members can unsend or delete messages, and the retention behavior.
- Account deletion and report-evidence retention periods.
- Payment provider and webhook verification design.
- Staff roles and narrowly scoped moderation permissions.

## Current status

**Design only — not approved for database execution.** No Supabase tables, policies, storage buckets, or migrations have been created by this document.
