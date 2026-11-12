# JoyHeart Messaging — Protocol & Library Evaluation (Phase 0)

**Status:** EVALUATION COMPLETE — NO PRODUCTION LIBRARY APPROVED  
**Repository:** `Joy-heart/joyheart`  
**Branch:** `phase-0/messaging-protocol-evaluation`  
**Baseline:** Phase 0 architecture merged to main in PR #63 (`ee9b09473987ecf061d6167d18aa91b5c2fc5c43`)  
**Scope:** Research and decision record only. No application code, dependency, database, infrastructure, secret, or deployment changes.

## 1. Executive recommendation

Do not adopt Signal's `libsignal` as a JoyHeart dependency without an explicit support arrangement and a successful platform proof. Signal's own repository says external use is unsupported and APIs may change.

For a unified first implementation, run a bounded proof-of-concept (PoC) of **MLS for both one-to-one and future group conversations**, comparing:

1. **AWS `mls-rs` — primary PoC candidate.** Its project documents RFC 9420 conformance, WebAssembly builds, configurable state storage, multiple crypto providers, and conformance/interoperability-focused tests. Its own security notice says it has not received a full third-party security audit. This is a candidate, not a production approval.
2. **OpenMLS — comparison candidate.** It is a maintained Rust RFC 9420 implementation with a WASM feature and Android/iOS targets that are built in CI but explicitly not supported/tested targets in the published platform matrix. The exact mobile and browser integration therefore remains unproven.
3. **`ts-mls` — web-oriented comparator only.** It is TypeScript and targets browsers/Node, but its repository explicitly says it has not had a formal security audit. Do not use it in production without a dedicated audit and successful interoperability tests.
4. **Signal `libsignal` — reference/research comparator only.** It implements Signal Protocol/Double Ratchet and offers Java, Swift and TypeScript APIs, but its maintainers explicitly say use outside Signal is unsupported.

This recommendation avoids committing to separate one-to-one and group protocols before proving the client matrix. MLS is designed for groups from two participants upward, so using MLS for direct conversations is a plausible unification strategy, but it must pass usability, latency, state recovery, and interoperability testing before adoption.

**Decision:** Select `mls-rs` as the first PoC candidate, OpenMLS as the Rust comparison, and keep all production protocol/library selection BLOCKED until the gates in Section 6 pass. This is not a claim that either implementation is independently audited.

## 2. Evidence comparison

| Candidate | Evidence found | Platform implications | Security / support finding | Evaluation decision |
|---|---|---|---|---|
| Signal `libsignal` | Implements Signal Protocol including Double Ratchet; Java, Swift and TypeScript APIs over Rust | Relevant platform bindings exist in Signal's own clients, but integrating into JoyHeart still requires compatibility and lifecycle proof | External use explicitly unsupported; APIs may change without notice | Do not select as dependency absent a support agreement and engineering proof |
| AWS `mls-rs` | Project states 100% RFC 9420 conformance, WASM builds, configurable state, test vectors and interoperability/security-focused tests | WASM is promising for web; native Rust integration is plausible for mobile, but Expo/RN bridge, secure storage and release builds must be proven | Project explicitly says no full third-party security audit | Primary PoC candidate only |
| OpenMLS | RFC 9420 Rust implementation; supported cipher suites; JS/WASM feature | Published docs list Android, iOS and WASM among targets built on CI but explicitly not tested/supported; native packaging needs validation | Maintained by Phoenix R&D / CE Labs; published platform matrix limits what can be claimed | Comparison candidate |
| `ts-mls` | TypeScript MLS RFC 9420 implementation, browser/Node use | Natural web integration; React Native/mobile runtime and crypto-provider behavior need testing | Repository explicitly says no formal security audit | Web comparator only; not production approved |

## 3. Important technical conclusions

### 3.1 One protocol versus two

A Signal-style one-to-one plus MLS groups design is possible, but it creates two protocol implementations, two state models, two sets of device lifecycle rules, and a more complex migration story.

An MLS-first architecture could cover both direct and group conversations using the same protocol family. RFC 9750 describes MLS architecture for secure messaging groups and discusses its security goals and trade-offs. This is an architectural simplification hypothesis, not proof that MLS is the best UX or performance choice for direct chats.

**Recommended PoC scope:** two participants, two devices per participant, asynchronous/offline delivery, device add/remove, recovery, and then a small group test. Do not build a public group feature yet.

### 3.2 State and key storage

- MLS private state and secrets must remain client-side and be protected by platform secure storage.
- The server may distribute public KeyPackages and store opaque protocol messages, but must not become the authoritative holder of client private state or a decryption key.
- A local persistence adapter must be tested for crash consistency, backup exclusion, database encryption, rollback/replay behavior and schema upgrades.
- Never enable debug features that print content or key material in production builds.
- A device restore must be a cryptographically authenticated client process; no server master key or silent escrow.

### 3.3 Cross-platform strategy

The PoC must prove the same protocol test vectors and message exchanges across:
- JoyHeart web client in supported browsers;
- Android native runtime used by the eventual Expo app;
- iOS native runtime used by the eventual Expo app.

A library merely compiling to WASM or an Android/iOS target is not enough. It must run in the actual app runtime, persist state safely, survive app restarts, and interoperate byte-for-byte with the other clients.

### 3.4 Calling is a separate security gate

WebRTC Encoded Transforms are now available in current modern browser versions, but older browsers/devices may not support them. This does not prove equivalent support in the React Native native WebRTC stack. Calling remains out of the first messaging PoC and must fail closed if frame-level E2EE cannot be negotiated. Do not silently downgrade to server-readable media.

## 4. Recommended architecture direction (provisional)

- **Protocol family:** MLS-first PoC for both direct and future group conversations.
- **First candidate:** `mls-rs`.
- **Comparison:** OpenMLS; `ts-mls` only as a web-focused comparator.
- **Signal:** reference only unless its external-use/support status changes in a way JoyHeart can verify.
- **Transport/storage:** unchanged from the merged architecture — Worker authorization, PostgreSQL durable ciphertext, Realtime wake-up only, private R2 for ciphertext media.
- **Trust boundary:** client-only plaintext and private keys; no server decryption, key escrow, plaintext moderation or plaintext push payloads.

No dependency should be added to the JoyHeart repository during this evaluation phase.

## 5. Required PoC test matrix

| Area | Required proof | Pass condition |
|---|---|---|
| Protocol conformance | Official RFC/test vectors and implementation test suites | All applicable tests pass; deviations documented |
| Interoperability | Two independent client builds exchange messages | Cross-implementation messages decrypt correctly |
| Web | Supported browsers, worker/WASM runtime, reload and offline | No plaintext/key leakage; durable local protocol state |
| Android | Actual target device, app restart, process kill, secure storage | Same protocol behavior; no key export to server |
| iOS | Actual target device, app restart, process kill, secure storage | Same protocol behavior; no key export to server |
| Multi-device | Add a second device and send/receive while one is offline | Explicit user approval; correct per-device state |
| Revocation | Revoke a device and attempt future message access | Revoked device receives no future decryptable messages |
| Recovery | Restore using user-controlled recovery material | No server escrow; loss limitations are clear |
| Async ordering | Duplicate, delayed, replayed and out-of-order delivery | Protocol state remains safe; no duplicate user-visible sends |
| Crash safety | Kill app during commit/state persistence | No unrecoverable state split or silent key rollback |
| Metadata | Inspect Worker, DB, Realtime, push and logs | No plaintext or private key material |
| Performance | Measure encrypt/decrypt, state updates and storage on low-end devices | Product-defined latency/memory budgets met |
| Supply chain | Pin versions, audit dependencies, license and build provenance | Reproducible approved dependency set |
| Security review | Independent cryptographic review of exact version and integration | No unresolved critical/high findings before production |

## 6. Production approval gates

Production selection remains blocked until all are true:

1. Exact version, license, maintainers and vulnerability response process are verified.
2. Independent cryptographic audit covers the selected library version and JoyHeart integration.
3. Web, Android and iOS PoC builds pass the same interoperability and lifecycle tests.
4. Device enrollment, linking, revocation and recovery have been threat-modelled and tested.
5. Local protocol-state persistence and backup exclusion are verified on each platform.
6. Server-side black-box tests prove no endpoint, log, analytics event, push payload or storage path receives plaintext or private keys.
7. Performance, memory, offline and low-bandwidth budgets are measured.
8. Product owner accepts the documented trade-offs and residual risks.

## 7. Current decision register

| Decision | Current state |
|---|---|
| Signal vs MLS | Prefer MLS-first PoC; no production selection |
| Primary PoC candidate | `mls-rs` |
| Comparison candidate | OpenMLS |
| TypeScript candidate | `ts-mls`, comparator only |
| Production crypto library | BLOCKED |
| Direct message protocol | MLS PoC only; no release commitment |
| Group messaging | Later release, same MLS PoC family if validated |
| Device recovery | Must remain user-controlled; exact UX still open |
| Calls | Excluded from first messaging implementation |
| External audit | Required before production approval |

## 8. Next authorized engineering task

After this evaluation record is reviewed, the next task is a **non-production, isolated compatibility PoC plan**. It should test candidate libraries without adding them to the production app, without creating database tables, and without changing live infrastructure. The PoC should use synthetic accounts and test keys only.

No production dependency, schema migration, Worker route, R2 bucket, secret, or deployment is authorized by this report.

## 9. References

- Signal libsignal repository and external-use caveat: https://github.com/signalapp/libsignal
- AWS mls-rs implementation and security notice: https://github.com/awslabs/mls-rs
- OpenMLS implementation and platform matrix: https://github.com/openmls/openmls
- OpenMLS crate documentation: https://docs.rs/openmls/latest/openmls/
- ts-mls implementation and security disclaimer: https://github.com/LukaJCB/ts-mls
- IETF RFC 9420 — Messaging Layer Security Protocol: https://www.rfc-editor.org/rfc/rfc9420
- IETF RFC 9750 — Messaging Layer Security Architecture: https://www.rfc-editor.org/rfc/rfc9750
- MDN — WebRTC Encoded Transforms: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_Encoded_Transforms
- W3C WebRTC Encoded Transform draft: https://w3c.github.io/webrtc-encoded-transform/

**Final status: protocol research documented; production implementation remains gated.**
