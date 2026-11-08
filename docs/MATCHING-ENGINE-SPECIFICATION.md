# JoyHeart matching engine specification

## Purpose

Define how JoyHeart ranks discovery candidates, records interest, creates mutual matches, and protects members from unwanted contact.

This document is a product and engineering specification only. It does not create database tables, migrations, or live matching behavior.

## Product principles

1. Recommend people for meaningful compatibility, not just profile popularity.
2. Explain recommendations in plain language using only information a member chose to share.
3. Give members control over discovery, visibility, and contact.
4. Never reveal who liked or passed on a member unless the product explicitly supports a consent-based feature.
5. A match requires mutual, active interest.
6. Blocking, reporting, age eligibility, and account restrictions override all ranking scores.
7. Do not infer sensitive traits such as religion, race, health, sexual orientation, or political beliefs from photos, names, messages, or behavior.
8. Do not sell ranking position or allow payment to bypass safety and eligibility rules.

## Matching pipeline

### 1. Eligibility gate

Before scoring a candidate, the trusted server must confirm:

- Both accounts are active and eligible under the platform's age and country rules.
- Both members have enabled discovery and meet profile publication requirements.
- The candidate satisfies each member's explicit discovery preferences.
- Neither member has blocked the other.
- Neither member is suspended, restricted, or hidden by a safety rule.
- The candidate has not already been passed, dismissed, or otherwise excluded under the member's current discovery settings.
- The candidate is not the requesting member.

Ineligible candidates must never reach the ranking stage.

### 2. Compatibility scoring

Initial score model (weights are configuration values and must be calibrated with consent-based product research):

| Signal | Initial weight | Explanation |
| --- | ---: | --- |
| Relationship intention alignment | 30% | Both members seek compatible relationship outcomes |
| Shared interests | 20% | Overlap in interests each member chose to disclose |
| Language compatibility | 15% | Shared or mutually selected languages |
| Lifestyle and values prompts | 15% | Alignment across optional, non-sensitive prompts |
| Geographic preference fit | 10% | Country/region or coarse distance preference, if enabled |
| Age preference fit | 5% | Whether each member falls within the other's selected age range |
| Profile completeness | 5% | Helps avoid empty recommendations, without penalizing members for optional sensitive disclosures |

The score is a ranking aid, not a promise of relationship success. It must not be presented as scientific, psychological, or predictive certainty.

### 3. Diversity and freshness

After eligibility and base scoring:

- Avoid showing the same small set of highly active profiles repeatedly.
- Apply a modest freshness adjustment to recently active, eligible profiles without rewarding compulsive app use.
- Rotate recommendations across eligible regions and interest clusters where member preferences permit.
- Avoid popularity-only ranking and avoid systematically suppressing new members.
- Provide a clear "why you're seeing this person" explanation based on disclosed matching factors.
- Limit repeated exposure after a member dismisses a candidate.

### 4. Discovery presentation

Each recommendation card may show only approved public discovery fields:

- Display name and derived age.
- Approved profile photos.
- Member-selected city/region/country visibility.
- Short biography and selected interests.
- Relationship intention and selected languages.
- A small number of grounded compatibility reasons.

Do not show exact birth date, contact details, exact location, private preferences, outgoing likes, report history, verification evidence, or internal ranking signals.

## Likes, passes, and mutual matches

### Likes

- A signed-in, eligible member can like an eligible discoverable profile.
- The server verifies eligibility, block status, and duplicate state.
- A member can withdraw their own active like under the defined product policy.
- Outgoing likes are private to the sender and trusted server-side matching logic.

### Passes

- A pass removes a candidate from the current discovery queue according to the configured resurfacing policy.
- A pass must not notify the other member.
- A member can change their discovery preferences without exposing past pass activity.

### Mutual match creation

A match is created only when:

1. Member A has an active like for Member B.
2. Member B has an active like for Member A.
3. Both remain eligible and neither has blocked the other.
4. Trusted server-side logic verifies the reciprocal state.
5. The database enforces one active match relationship per member pair.

Match creation must be atomic and idempotent so retries cannot create duplicate matches.

Both members may see the match. Neither may directly set a match status or insert a match row through an unrestricted client request.

## Messaging eligibility

- Messaging is available only to participants in an active match.
- Each message write must verify the sender is the authenticated conversation participant.
- Blocking either direction immediately prevents new messages.
- Unmatching prevents new messages according to the product's retention policy.
- Reporting a message or member must not expose the report to the reported member.
- Moderation restrictions override match state.

## Safety and abuse controls

- Rate-limit likes, passes, match creation attempts, and message sending.
- Detect unusual automation and spam behavior using proportionate, reviewable signals.
- Do not use opaque behavioral profiling to infer sensitive personal characteristics.
- Provide block and report actions from discovery, profiles, matches, and conversations.
- Prevent blocked profiles from appearing in either member's discovery results.
- Keep safety review data restricted to authorized staff.
- Provide an appeal process for significant account restrictions.

## Premium product boundaries

Paid features may include additional convenience, such as extra filters, profile customization, or optional visibility controls, after privacy review.

Paid features must not:

- Bypass age, block, report, or account restrictions.
- Reveal private outgoing likes without a clear consent-based design.
- Guarantee matches or relationship outcomes.
- Make a member's private profile visible against their settings.
- Allow unlimited automated engagement that harms other members.

## Explainability and evaluation

Each recommendation should be explainable using a small set of disclosed factors, for example:

- "You both want a long-term relationship."
- "You share three interests."
- "You selected languages in common."

Evaluate the system for:

- Eligible candidate quality and relevance.
- Member satisfaction and meaningful conversations.
- Diversity of recommendations.
- Duplicate and repeated recommendation rates.
- Abuse, spam, block, and report rates.
- False exclusions and fairness across supported regions.
- Whether premium features create unfair or unsafe ranking outcomes.

Do not optimize solely for time spent, swipes, or message volume.

## Initial release scope

The first matching release should include:

1. Eligibility filtering.
2. Explicit member preferences.
3. A transparent, deterministic compatibility score.
4. Discovery cards with grounded reasons.
5. Likes and passes.
6. Atomic mutual match creation.
7. Block and report enforcement.
8. Basic operational and abuse rate limits.

Machine learning, behavioral predictions, face recognition, and inferred sensitive attributes are explicitly out of scope for the initial release.

## Decisions required before implementation

- Minimum age and supported-country rules.
- Launch countries and location precision.
- Exact relationship-intention options.
- Which optional lifestyle prompts are supported.
- Whether a pass can ever resurface a profile and under what controls.
- Whether likes can be withdrawn and whether existing matches persist.
- Match expiry or inactivity rules, if any.
- Whether members can unmatch and what happens to message history.
- Premium feature boundaries and pricing policy.

## Status

**Specification drafted — not implemented.** No matching tables, scoring functions, database policies, or user-facing like/match flows have been created by this document.
