# Messaging Protocol Decision Record — MLS PoC

**Status:** PROVISIONAL — no production protocol or library selected.

## Context
JoyHeart requires end-to-end encrypted messaging, multiple devices, web and mobile clients, and future group conversations. The project charter prohibits custom cryptography, server plaintext access and universal key escrow.

## Candidate evidence

### AWS mls-rs
- Project advertises RFC 9420 conformance, WASM builds, configurable storage and interoperability/test-vector tests.
- Project explicitly states it has not received a full third-party security audit.
- GitHub releases page currently reports no packaged releases; pin an exact commit SHA for any experiment.
- License reported as Apache-2.0 or MIT; verify exact license files at pinned commit.
- Web Crypto provider is marked experimental/unsupported in the project README's provider table.

### OpenMLS
- Latest release found: v0.9.0 (2026-08-03), abbreviated tag commit `3a3e35d`; exact full commit must be resolved before testing.
- Rust MSRV 1.91.
- Project says Android, iOS and WASM targets are built on CI but unsupported/not tested.
- Maintained by Phoenix R&D and CE Labs.
- Review v0.9.0 storage-format and security-related changelog changes before pinning.

### ts-mls
- TypeScript MLS implementation, suitable only as a web comparator in this PoC.
- Explicitly not formally audited.
- No production approval.

### Signal libsignal
- Maintainers explicitly state external use is unsupported and APIs may change.
- Research reference only unless the support position changes and is independently verified.

## Provisional decision
Run mls-rs as the primary candidate, OpenMLS as an independent Rust comparison and ts-mls as a web comparator. Evaluate MLS for both two-person direct conversations and future groups. This is a test strategy, not a production architecture commitment.

## Rejected shortcuts
- No dependency added to production package.
- No claim that WASM compilation proves browser compatibility.
- No claim that Android/iOS Rust target compilation proves app integration.
- No claim that protocol conformance equals an independent security audit.
- No server-side plaintext or key escrow.

## Decision gates
1. Exact candidate revisions and licenses pinned.
2. Official conformance suites pass.
3. Independent implementation interoperability passes.
4. Browser runtime test passes.
5. Android app runtime test passes.
6. iOS app runtime test passes.
7. Multi-device, revocation, KeyPackage replay, offline and recovery tests pass.
8. No plaintext/private-key leakage.
9. Benchmarks on target hardware completed.
10. Independent cryptographic review and product-owner approval.

## Decision
**PRODUCTION LIBRARY: NOT SELECTED.** PoC execution is incomplete. Reassess only after reproducible evidence is attached.
