# JoyHeart Messaging — Phase 0 Architecture & Technical Readiness

**Status:** IN PROGRESS — architecture proposal, not implementation approval  
**Repository:** `Joy-heart/joyheart`  
**Branch:** `phase-0/messaging-architecture`  
**Scope:** Phase 0 only. No application features, database migrations, infrastructure changes, secrets, or deployment are authorized by this document.

## 1. Executive decision

Build a modular, end-to-end encrypted messaging system in which JoyHeart's backend is a delivery and ciphertext-storage service, not a trusted reader of private conversations.

The first release should prioritize reliable one-to-one private conversations and multi-device foundations. Group messaging, voice/video calls, encrypted media, advanced search, and recovery must be designed into the contracts but released only after their individual security gates pass.

**Non-negotiable boundary:** Supabase, Cloudflare Workers, Realtime, operators, support staff, analytics, notification providers, and storage providers must not receive message plaintext or private messaging keys during normal operation.

A message may be voluntarily decrypted and submitted by a participant as evidence in a report. That explicit user action is the only moderation path for private message content.

## 2. Product requirements specification

### 2.1 Actors and core objects
- Account: authenticated JoyHeart identity.
- Device: independently registered cryptographic endpoint belonging to an account.
- Conversation: private relationship between participants, initially one-to-one.
- Conversation membership: explicit participant/device authorization state.
- Message envelope: opaque encrypted payload plus strictly minimized routing metadata.
- Attachment: encrypted media object and encrypted per-object key material.
- Delivery event: non-content state used to synchronize delivery/read receipts.
- Report evidence: content explicitly selected and submitted by a reporting user.

### 2.2 Functional requirements
1. Start a conversation only when product authorization rules permit it.
2. Send, receive, retry, synchronize and acknowledge encrypted messages.
3. Support sent, delivered and read states without exposing message content.
4. Support typing and online indicators as short-lived, opt-in presence signals.
5. Support replies, reactions, edits and deletion using authenticated encrypted events.
6. Support images, video and voice notes encrypted on the sender device before upload.
7. Support per-device identity, device linking, revocation and key rotation.
8. Support blocking, reporting, conversation controls and abuse rate limits.
9. Provide client-side conversation search; the server must not index plaintext.
10. Provide a documented user-controlled recovery and device migration path.
11. Design for audio/video calls but do not enable calls until the call-security gate passes.
12. Provide accessible, responsive web/mobile interaction and clear encryption/device status.

### 2.3 Non-functional requirements
- Durable ciphertext storage and idempotent send operations.
- At-least-once transport with client-side deduplication; do not promise exactly-once delivery.
- Offline synchronization with bounded retry and retention policies.
- Explicit authorization on every conversation and device operation.
- No shared caching of authenticated conversation data.
- Observability based on operational metadata only; never log plaintext, keys, tokens or decrypted attachments.
- Accessibility, localization, low-bandwidth resilience and graceful reconnect behavior.

## 3. System architecture

### 3.1 Proposed logical flow

```text
Web / Mobile Client
  ├─ Account authentication (Supabase Auth)
  ├─ Device identity + local secure key store
  ├─ E2EE protocol engine (audited implementation)
  ├─ Local encrypted message cache + local search index
  ├─ Attachment encryption / decryption
  └─ Call client (later phase)
          │ authenticated HTTPS
          ▼
Cloudflare Worker API
  ├─ session + device authorization
  ├─ conversation membership checks
  ├─ ciphertext envelope validation / size limits
  ├─ rate limits + abuse controls
  └─ idempotent durable-write orchestration
          │
          ├──────── Supabase PostgreSQL
          │          ciphertext + minimal metadata
          │
          ├──────── Supabase Realtime
          │          opaque wake-up / delivery events only
          │
          ├──────── Cloudflare R2
          │          encrypted attachment blobs
          │
          └──────── APNs / FCM
                     generic notification payloads only
```

### 3.2 Component responsibilities
- **Client:** owns plaintext, protocol state and private keys. Encrypts before network transmission and decrypts only after authenticated receipt.
- **Supabase Auth:** authenticates accounts. Account authentication alone does not authorize access to a conversation or device.
- **Cloudflare Worker:** validates account/device/session, checks membership and policy, applies rate limits, writes ciphertext and coordinates delivery. It must not contain decryption code or key escrow.
- **PostgreSQL:** durable ciphertext envelopes, membership, device public-key records and minimal delivery state. RLS is mandatory as defense in depth; Worker authorization is not a substitute.
- **Supabase Realtime Broadcast:** transient notification that new ciphertext may be available. Treat it as untrusted, potentially duplicated, delayed or missed. Clients fetch authoritative ciphertext through an authenticated API.
- **Presence:** ephemeral and privacy-controlled. Do not use presence as proof of identity, authorization or delivery.
- **R2:** private object storage for already-encrypted media. Object names should be opaque; access is short-lived and authorized.
- **APNs/FCM:** generic notification such as “You have a new message”; never include plaintext, sensitive profile data, encryption keys or attachment URLs that bypass authorization.

### 3.3 Reliability model
- Persist ciphertext before emitting a delivery event.
- Use a client-generated idempotency identifier scoped to sender device and conversation.
- Acknowledge durable acceptance separately from recipient delivery and read state.
- Reconcile missed Realtime events by cursor-based authenticated sync.
- Deduplicate by immutable message/event identifier.
- Define bounded retries, backoff, queue limits, expiry and dead-letter/poison-message handling.
- A message is not “delivered” merely because a Realtime broadcast was emitted.

## 4. Database entity relationship design (conceptual only)

No SQL or migration is authorized in Phase 0.

| Entity | Purpose | Sensitive fields / controls |
|---|---|---|
| accounts | References authenticated user | No authorization from editable profile metadata |
| messaging_devices | Registered account devices and public identity keys | Public keys only; private keys remain on device |
| device_key_packages | Signed/prekey or protocol package publication and lifecycle | Public material, expiry, consumption and replay controls |
| conversations | Opaque conversation identity and protocol mode/version | Minimal metadata; no plaintext title/snippet |
| conversation_members | Account membership and status | Explicit membership, role and join/leave timestamps |
| conversation_device_state | Per-device protocol/sync state references | Never store plaintext private protocol state or secrets |
| message_envelopes | Durable encrypted payloads | Ciphertext, nonce/header as protocol requires, sender device, sequence/idempotency |
| message_receipts | Accepted/delivered/read state | Minimize metadata and define privacy controls |
| message_events | Encrypted edit/delete/reaction/reply event envelopes | Do not store plaintext reaction/comment bodies |
| attachments | Opaque object key, encrypted size/type metadata and lifecycle | Media ciphertext only; content key travels inside E2EE payload |
| blocks | Account-level blocking relationships | Enforced before conversation and delivery operations |
| reports | Abuse report workflow | Evidence only if user explicitly submits it |
| report_evidence | User-submitted selected plaintext/media evidence | Strict staff access, audit, retention and legal process |
| rate_limit_events | Abuse and operational throttling | Minimize identifiers and retention |

### 4.1 Required relationships
- One account has many devices.
- One conversation has two or more members (first release may constrain to two).
- One member may have multiple authorized devices.
- One conversation has many immutable message envelopes/events.
- One message may reference zero or more encrypted attachments.
- Receipts are per recipient device or per account according to the final UX/privacy decision.
- A report belongs to a reporting account and may reference a conversation/message identifier; decrypted evidence exists only when explicitly submitted.

### 4.2 Database security rules
- RLS enabled on every exposed table before data access.
- Deny-by-default policies; test as anonymous, participant A, participant B, unrelated account and revoked device.
- No client direct insert/update to privileged membership, device ownership, receipt or report-review fields.
- Worker uses narrowly scoped server-side credentials only on server; never expose service-role credentials.
- Use immutable message identity and append-only event semantics where practical.
- Deletion semantics must distinguish user-visible deletion, recipient copies, retention/legal holds and backup expiry; never promise remote erasure of already downloaded plaintext.

## 5. API specification (proposed contracts)

All endpoints are versioned under `/api/v1/messaging`. HTTPS required. All requests authenticate the account and a registered device. Every operation rechecks membership, block state, device status, size limits and rate limits.

| Method / route | Purpose | Required controls |
|---|---|---|
| POST `/devices/register` | Register device and public identity material | Proof of account session + device-key possession |
| GET `/devices` | List account devices | Owner-only; public metadata only |
| POST `/devices/{id}/revoke` | Revoke device | Recent re-authentication; notify remaining devices; rotate protocol state |
| POST `/key-packages` | Publish protocol public packages | Signature, expiry, uniqueness and replay checks |
| GET `/key-packages/{accountId}` | Fetch eligible public packages | Privacy-preserving discovery; package consumption rules |
| POST `/conversations` | Create authorized conversation | Relationship/messaging policy and block checks |
| GET `/conversations` | List current user's conversations | Cursor pagination; no plaintext previews |
| GET `/conversations/{id}/sync` | Fetch ciphertext since cursor | Membership + device authorization; bounded page |
| POST `/conversations/{id}/messages` | Submit encrypted envelope | E2EE envelope validation, idempotency, quotas |
| POST `/messages/{id}/receipts` | Submit delivery/read receipt | Recipient membership; anti-spoofing |
| POST `/conversations/{id}/events` | Submit encrypted edit/reaction/delete event | Sender authorization and immutable event history |
| POST `/attachments/upload-ticket` | Obtain constrained upload authorization | Membership, encrypted object size/type limits |
| GET `/attachments/{id}/download-ticket` | Obtain constrained download authorization | Membership, expiry and revocation |
| POST `/reports` | Submit safety report | Explicit user action; evidence consent and audit |
| POST `/calls/sessions` | Create call signaling session (later phase) | Call policy, device authorization, short-lived credentials |

### 5.1 API invariants
- Server validates envelope structure and protocol version but cannot decrypt it.
- Never accept plaintext fallback when E2EE negotiation fails.
- Never accept a client-supplied user ID as proof of identity.
- Every write supports idempotency and rejects replay outside defined protocol semantics.
- Responses and logs exclude plaintext and private keys.
- Error messages do not reveal whether another user's conversation exists.
- Cursors are opaque, scoped and validated.
- Upload tickets are short-lived, object-scoped and cannot overwrite arbitrary objects.

## 6. Messaging security and cryptographic architecture

### 6.1 Protocol selection: gated recommendation
- **One-to-one candidate:** Signal Protocol / Double Ratchet family, only if the exact maintained client library, supported platforms, license, API stability, security review and operational compatibility are approved.
- **Group candidate:** MLS under RFC 9420, with RFC 9750 architecture guidance, using a maintained interoperable implementation that passes platform and security evaluation.
- Do not implement a home-grown ratchet, key agreement, KDF, AEAD, signature scheme or custom cryptographic protocol.
- Do not assume that a protocol standard automatically makes a particular library safe or production-ready.
- A two-member MLS group is a possible unification option, but it must be benchmarked and audited before selecting it for one-to-one chats.
- Final protocol choice remains **BLOCKED pending implementation/library proof-of-concept and independent cryptographic review**.

### 6.2 Library evaluation
Evaluate candidates against:
1. Independent security audit and public vulnerability history.
2. Maintainer activity, release cadence and support policy.
3. Web, React Native/Expo, iOS and Android compatibility.
4. Stable supported APIs; avoid undocumented/private bindings.
5. License compatibility and redistribution obligations.
6. Correct device identity, multi-device and device-removal semantics.
7. Forward secrecy and post-compromise security properties.
8. Async/offline operation, out-of-order delivery and state persistence.
9. Interoperability test vectors and protocol conformance suites.
10. Memory safety, side-channel considerations and secure randomness.
11. Upgrade/migration path and protocol version negotiation.
12. Ability to keep private keys and plaintext on endpoint devices.

**Known evaluation caution:** Signal's public `libsignal` repository exposes TypeScript, Java and Swift APIs backed by Rust, but its maintainers state that external use is unsupported and APIs may change. It is therefore a candidate for technical evaluation, not an approved dependency or a promise of stable third-party support. The team must verify current terms, platform packaging and maintenance before adoption.

### 6.3 Key lifecycle
- Each device generates its private identity material locally using a vetted cryptographic library and OS-backed secure storage where available.
- Publish only authenticated public identity/prekey material.
- Bind device keys to account identity with a verifiable device-registration ceremony.
- Verify new devices through an existing trusted device or a user-controlled recovery mechanism.
- On device revocation, stop issuing new ciphertext to that device and perform protocol-defined membership/key updates. Historical messages already decrypted on that device cannot be remotely erased.
- Rotate/refresh keys according to protocol lifecycle and incident response.
- Never upload private identity keys, plaintext backups or recovery secrets to the application server.

### 6.4 Recovery and multi-device
- Preferred: authenticated device-to-device linking with a QR/short-lived pairing ceremony and end-to-end protected transfer.
- Alternative: user-held high-entropy recovery secret that encrypts a client-side backup; recovery key is never sent to the service in plaintext.
- Clearly warn that losing all devices and recovery material may mean messages cannot be recovered. Do not add a server-side master key or silent escrow.
- A new device must not silently inherit access to old conversations; users must see and approve device enrollment.
- Device revocation, session invalidation and cryptographic group/key updates must be atomic from the user's perspective.

### 6.5 Metadata limits
E2EE does not hide all metadata. The service may still observe some combination of account/device identifiers, conversation routing identifiers, timing, message sizes, delivery status, IP/network data and attachment sizes. Minimize, scope, protect and retain only what operations require. Do not claim “zero metadata.”

## 7. Encrypted media architecture
1. Client validates and safely transforms media before encryption.
2. Client encrypts media locally with a fresh content key and nonce using an audited library.
3. Upload only ciphertext to a private R2 bucket using a short-lived constrained ticket.
4. Send the media key, nonce and integrity metadata only inside the E2EE message envelope.
5. Recipient downloads ciphertext, verifies integrity and decrypts locally.
6. Server-side moderation cannot inspect private media by default. A user may explicitly submit media as report evidence.
7. Enforce upload size, MIME allowlist, actual file signature checks where possible before encryption, quotas, expiry and malware/abuse controls that do not require plaintext inspection.
8. Avoid public object URLs and predictable object identifiers.

## 8. Audio/video calling evaluation

### 8.1 Proposed architecture
- WebRTC for real-time media.
- A managed or self-operated SFU may forward encrypted media packets but must not be trusted with call plaintext.
- Use WebRTC Encoded Transforms / Insertable Streams where supported to encrypt encoded frames end-to-end before SFU forwarding.
- Separate call signaling authorization from media confidentiality.
- Use short-lived TURN credentials and minimize call metadata retention.
- Calls require explicit accept/decline, block checks, abuse controls and clear camera/microphone indicators.

### 8.2 Compatibility and security gate
Encoded Transforms are supported in current modern browser engines but may not work on older devices. Validate exact target browser versions, iOS Safari/WebKit, Android WebView and React Native native WebRTC stack. Never silently downgrade to server-readable media. If E2EE cannot be negotiated, fail closed or clearly label an explicitly user-approved non-E2EE mode only if product policy later permits it.

### 8.3 Not in first messaging release
Do not build calling in parallel with the first text messaging release. First prove device identity, E2EE, ciphertext persistence, synchronization and revocation.

## 9. Threat model

| Threat | Impact | Primary mitigations |
|---|---|---|
| Malicious/compromised backend | Conversation disclosure or tampering | E2EE, authenticated protocol envelopes, client verification |
| Cross-user IDOR | Unauthorized conversation access | Membership checks, RLS, opaque errors, multi-account tests |
| Stolen account session | Unauthorized device enrollment | Device-bound keys, recent re-auth, alerts, revocation |
| Malicious/revoked device | Continued access to future messages | Device inventory, revocation, protocol key updates |
| Replayed or duplicated messages | Confusion, duplicate actions | Nonces/counters per protocol, idempotency, replay windows |
| Lost/out-of-order events | Missing or reordered messages | Durable cursor sync, bounded queues, protocol state handling |
| Push provider compromise | Metadata leakage | Generic notifications, no plaintext or keys |
| R2 object exposure | Private media disclosure | Private bucket, ciphertext-only objects, short-lived tickets |
| Malicious attachments | Malware, parser exploit | Client validation, size/type limits, safe decoding and isolation |
| Insider abuse | Unauthorized evidence access | No plaintext admin access; scoped report evidence and audit |
| Spam/scams/harassment | User harm | Rate limits, blocks, reports, safety signals, appeals |
| DoS/resource exhaustion | Service outage/cost | Quotas, bounded payloads, backpressure, abuse throttling |
| Client compromise | Plaintext/key theft | OS secure storage, hardening, session/device controls; residual risk disclosed |
| Metadata analysis | Relationship/timing inference | Minimize fields, retention, access and notification detail |

### Security assumptions and limits
- A compromised endpoint can read content displayed on that endpoint.
- E2EE cannot prevent screenshots, copying or a recipient intentionally sharing content.
- A malicious participant can submit their own conversation content as report evidence.
- Account authentication and E2EE identity verification solve different problems; both are required.
- The service must be treated as untrusted for content confidentiality but still responsible for availability, access control, abuse handling and metadata protection.

## 10. Privacy and regulatory assessment

JoyHeart targets multiple countries. A single generic legal statement is insufficient. Before launch, map applicable laws by user location, company establishment, processing purpose and data category. Counsel must assess, at minimum:
- Kenya Data Protection Act and applicable regulations, including controller/processor duties and cross-border transfer requirements.
- EU/EEA GDPR where territorial scope applies.
- UK GDPR and Data Protection Act where applicable.
- Other national privacy, consumer, child-safety, cybercrime, electronic communications and breach-notification rules in target markets.
- Age assurance and adult-only access obligations; do not rely on a self-declared date of birth alone without a risk-based assessment.
- Lawful basis, transparency, data minimization, retention, data-subject rights and processor contracts.
- Whether a DPIA or equivalent impact assessment is required, especially for location, dating, sensitive relationship data, profiling and safety monitoring.
- Cross-border transfers and subprocessor locations.
- Data breach response, incident timelines and user notification.
- Records of processing, access control and privacy-by-design documentation.

This is an engineering assessment checklist, not legal advice or a finding of compliance. Before launch, JoyHeart must identify its actual legal entity/controller, privacy contact, subprocessors, data locations, retention schedule and target countries with qualified counsel.

## 11. GitHub governance and engineering controls
- Work on a dedicated feature branch; protect `main`.
- Require pull requests, independent approval and passing CI.
- No direct production database or infrastructure mutation.
- Keep migrations version-controlled and separate from application feature commits.
- Require code owners/reviewers for cryptography, authorization, database/RLS and deployment changes.
- Never commit credentials, private keys, sample real conversations or production user data.
- Dependency changes require license, maintenance, vulnerability and supply-chain review.
- PR template must include threat impact, data impact, tests, migration/rollback plan and operational impact.
- Do not merge until all required checks pass and approval is recorded.

## 12. CI/CD and test strategy

### Required automated checks
- Formatting, lint, TypeScript and production build.
- Unit tests for envelope validation, state transitions, idempotency and cursor handling.
- Protocol library conformance tests and official test vectors.
- Integration tests for send/fetch/acknowledge/offline sync and duplicate/reordered delivery.
- RLS and API authorization tests with at least: anonymous, sender, recipient, unrelated user, blocked user, revoked device and staff/admin.
- Negative tests proving server endpoints cannot return plaintext or private key material.
- Secret scanning, dependency/SBOM and vulnerability checks.
- Attachment size/type/path traversal and upload-ticket authorization tests.
- Rate-limit, load, reconnect and backpressure tests.
- E2E tests across browsers and mobile devices.
- Security review before any production release.

### Acceptance evidence
A green build is necessary but insufficient. Each feature needs recorded test evidence, reviewer sign-off and a documented residual-risk decision.

## 13. Infrastructure and cost assessment

Use the existing JoyHeart stack only after confirming actual project configuration and plan limits:
- Cloudflare Workers: authenticated API and edge controls.
- Supabase PostgreSQL: durable ciphertext and minimal metadata.
- Supabase Realtime: ephemeral notification channel, not the source of truth.
- Cloudflare R2: private encrypted media objects.
- APNs/FCM: generic push notifications.
- TURN/SFU: later call phase, selected after regional latency, bandwidth, E2EE and pricing tests.

Cost drivers:
- Message/event row count and retention.
- Realtime connection count and broadcast volume.
- Attachment storage, egress and lifecycle.
- Worker request volume and execution duration.
- Push delivery provider and observability.
- TURN/SFU relay bandwidth, which can dominate calling costs.
- Backups, point-in-time recovery and regional data requirements.

Do not invent a monthly price before message volume, average attachment size, active devices, geographic distribution, retention and call minutes are measured. Establish per-user quotas and budget alerts before public launch.

## 14. Roadmap and phase acceptance criteria

### Phase 0 — Architecture and readiness (current)
Deliver this architecture, detailed product requirements, ER design, API contract, cryptographic and calling evaluation, threat model, privacy checklist, governance, CI/CD, cost model, roadmap and risk register.
**Exit:** independent review; unresolved decisions and owners documented; product owner approves Phase 0. No feature code or migrations.

### Phase 1 — Infrastructure readiness
Verify GitHub, Cloudflare, Supabase, secrets boundaries, deployment controls and operational monitoring.
**Exit:** least-privilege credentials, protected main, CI, backup/recovery and incident procedures proven. No production mutation without approval.

### Phase 2 — Database and authorization
Design and review schema/migrations, RLS and explicit membership/device authorization.
**Exit:** migrations reviewed; cross-user/RLS negative tests pass; rollback and recovery verified.

### Phase 3 — Account and device identity
Build authenticated device registration, device inventory, trusted linking and revocation foundations.
**Exit:** no unauthorized device can enroll; revocation blocks future access; device lifecycle tests pass.

### Phase 4 — Discovery/matching dependencies
Ensure messaging initiation policy is connected to approved matching/relationship rules and blocking.
**Exit:** only eligible users can initiate conversations; blocks and privacy settings are enforced server-side.

### Phase 5 — E2EE messaging
Integrate selected audited protocol; build send, sync, receipts, typing, offline support and encrypted media.
**Exit:** independent cryptographic review; protocol vectors pass; multi-device, offline, revocation, recovery and authorization tests pass.

### Phase 6 — Audio/video
Add WebRTC signaling, TURN/SFU and frame-level E2EE.
**Exit:** tested E2EE across supported devices; no silent downgrade; call abuse and network-failure tests pass.

### Phase 7 — AI intelligence
Add opt-in safety assistance without server-side access to private content. Any client-side suggestions must be clearly disclosed.
**Exit:** privacy review, consent controls, bias/safety evaluation and human appeal paths.

### Phase 8 — Community
Groups and events with explicit group membership, moderation and group E2EE decision.
**Exit:** group authorization and protocol membership changes verified.

### Phase 9 — Monetization
Subscriptions and entitlements must not weaken security or make privacy controls deceptive.
**Exit:** payment security, refund and entitlement tests.

### Phase 10 — Mobile applications
Ship Android/iOS clients with secure storage, push, device linking and platform-specific E2EE compatibility.
**Exit:** platform security and regression tests pass.

### Phase 11 — Independent audit
External security, cryptography, privacy, performance, accessibility and recovery review.
**Exit:** critical/high findings remediated or formally accepted with mitigation.

### Phase 12 — Controlled launch
Country-by-country readiness, support operations, monitoring and incident response.
**Exit:** launch checklist approved and production release explicitly authorized.

## 15. Risk register

| Risk | Severity | Mitigation / gate |
|---|---|---|
| No suitable maintained cross-platform protocol library | Critical | Prototype and audit before protocol commitment |
| Incorrect device enrollment/revocation | Critical | Threat-model review and adversarial tests |
| RLS/API membership bypass | Critical | Deny-by-default policies and multi-account tests |
| False claim of E2EE while server sees plaintext | Critical | Architectural separation, code review and black-box verification |
| Recovery design creates key escrow | Critical | User-held recovery only; independent review |
| Web/mobile library incompatibility | High | Early compatibility spike before implementation |
| MLS group state desynchronization | High | Conformance tests, bounded resync and state recovery |
| Realtime treated as durable delivery | High | Database cursor sync is authoritative |
| Push metadata leaks relationship activity | High | Generic notifications and opt-in controls |
| Encrypted media abuse cannot be scanned server-side | High | User reporting, metadata limits, quotas and safe client decoding |
| Call SFU sees plaintext or silent fallback | Critical | Frame E2EE proof and fail-closed negotiation |
| International regulatory mismatch | High | Country launch gates and counsel review |
| Metadata retention exceeds necessity | High | Data inventory, minimization and retention schedule |
| Storage/relay cost growth | Medium/High | Quotas, lifecycle policies, measurement and alerts |
| Protocol/library upgrade breaks old clients | High | Version negotiation, migration tests and supported-client policy |

## 16. Open decisions requiring evidence
1. Choose Signal-style one-to-one plus MLS groups, or MLS for both one-to-one and groups.
2. Select exact protocol implementations and verify supported Web, React Native, iOS and Android bindings.
3. Decide whether first release is one-to-one only (recommended) and when groups are enabled.
4. Define device linking and user-controlled recovery UX.
5. Define receipts granularity (per device vs per account) and privacy defaults.
6. Define message, attachment and metadata retention schedules.
7. Select SFU/TURN provider and prove frame-level E2EE before calls.
8. Confirm legal entity details, target launch countries, processors and data residency.
9. Confirm actual Supabase/Cloudflare plans and quotas before cost commitments.

## 17. Phase 0 approval checklist

- [ ] Product requirements accepted.
- [ ] Architecture and trust boundaries accepted.
- [ ] Conceptual ER model accepted.
- [ ] API contracts accepted.
- [ ] Cryptographic protocol and exact libraries independently evaluated.
- [ ] Device linking, revocation and recovery design accepted.
- [ ] WebRTC/SFU E2EE feasibility proven.
- [ ] Threat model reviewed.
- [ ] Privacy and country launch checklist reviewed by counsel.
- [ ] GitHub governance and CI/CD controls verified.
- [ ] Infrastructure cost assumptions measured.
- [ ] Risks and unresolved decisions assigned.
- [ ] Product owner explicitly approves Phase 0 exit.

**Current status: BLOCKED from application implementation until Phase 0 is independently reviewed and approved.**

## References

- IETF RFC 9420, Messaging Layer Security Protocol: https://www.rfc-editor.org/rfc/rfc9420
- IETF RFC 9750, Messaging Layer Security Architecture: https://www.rfc-editor.org/rfc/rfc9750
- Signal libsignal repository and external-use caveat: https://github.com/signalapp/libsignal
- WebRTC Encoded Transforms overview and compatibility considerations: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_Encoded_Transforms
