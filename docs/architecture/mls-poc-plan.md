# MLS Compatibility PoC Plan

**Status:** IN PROGRESS — environment inspection started; protocol execution not yet passed  
**Isolation location:** `C:\\Temp\\joyheart-mls-compatibility-poc` on authorized device EMPIRE; this is separate from the JoyHeart production worktree.  
**Git branch:** `experiment/mls-compatibility-poc`  
**Repository baseline:** `main`; application package currently contains no MLS dependency and no `apps/mobile` workspace.  
**Authorization:** synthetic test identities and isolated local experiments only.

## 1. Purpose

Prove real MLS behavior rather than treating compilation as compatibility. AWS mls-rs is primary; OpenMLS is an independent Rust comparison; ts-mls is a web-only comparator. Signal libsignal remains a research reference.

## 2. Environment discovery

Observed from repository `main`:
- Root application is a single package named `joyheart`.
- Runtime dependencies include React 19, Vinext/Cloudflare and Supabase SSR/client.
- No `apps/mobile/package.json`, `apps/web/package.json` or pnpm workspace file exists at the inspected paths.
- The application README states authentication, profiles, matching and messaging are not implemented.
- No MLS dependency is present in root `package.json`.

Observed on authorized Windows device EMPIRE:
- Windows command shell available.
- Git 2.54.0.windows.1.
- Node.js v24.16.0.
- npm 11.13.0.
- Rust compiler and Cargo were not on PATH at initial inspection. A Rust toolchain installation was attempted; final installation status must be verified before Rust tests.
- Android SDK/ADB, Xcode/iOS device and browser versions have not yet been verified.
- No actual Android or iOS device test has been performed.

## 3. Isolation rules

- Work only in `C:\\Temp\\joyheart-mls-compatibility-poc`.
- Never run npm/cargo install in the JoyHeart production repository.
- Do not copy production `.env`, tokens, credentials, user data or private keys.
- Use fixed synthetic identities Alice, Bob and Carol with generated throwaway keys.
- Keep test fixtures, logs and captures free of plaintext secrets and private key bytes.
- No network calls to Supabase, Cloudflare, R2, push providers or live JoyHeart APIs.
- Pin each candidate to an exact release/tag or commit before recording test evidence.
- Never enable debug features that print private MLS state or key material.

## 4. Candidate matrix

### A. AWS mls-rs — primary
- Repository: https://github.com/awslabs/mls-rs
- Public repository describes RFC 9420 conformance, WASM builds, configurable storage, in-memory and SQLite providers, and test vectors.
- Project security notice says no full third-party security audit has been completed.
- Repository reports no packaged GitHub releases; pin a verified commit SHA, not a floating branch.
- Verify exact license files and crypto-provider support at the pinned commit.

### B. OpenMLS — comparison
- Repository: https://github.com/openmls/openmls
- Latest release observed during research: v0.9.0, release date 2026-08-03; abbreviated tag commit shown as `3a3e35d`.
- Rust MSRV raised to 1.91 in v0.9.0.
- Project README says Android, iOS and WASM are built on CI but are listed as unsupported/not tested targets. Do not represent these as supported runtimes.
- v0.9.0 release notes include storage format changes and security-related fixes; use only current pinned release and review its changelog.

### C. ts-mls — web comparator
- Repository: https://github.com/LukaJCB/ts-mls
- TypeScript MLS implementation.
- Project explicitly says it has not undergone a formal security audit.
- Do not use for production or native mobile integration.

### D. Signal libsignal — reference only
- Repository: https://github.com/signalapp/libsignal
- Maintainers state external use is unsupported and APIs may change. No JoyHeart adoption in this PoC.

## 5. Test stages

1. Pin candidate revisions, licenses, Rust toolchain and crypto providers.
2. Run upstream unit/conformance tests at the pinned revision.
3. Build isolated minimal clients and test group creation, KeyPackage, Welcome, Commit and epoch transitions.
4. Cross-implementation interoperability: mls-rs ↔ OpenMLS where supported; do not mistake same-library client tests for independent interoperability.
5. Build web/WASM and test in a real browser.
6. Test Android only with a real Android runtime/device; iOS requires macOS/Xcode and a real simulator/device.
7. Test multi-device, revocation, replay, offline/restart, recovery and persistence.
8. Capture performance measurements with repeat counts and hardware/runtime details.
9. Review logs/network/storage for plaintext and key leakage.
10. Produce reproducible report; stop before production integration.

## 6. Required synthetic topology

- Alice — Web Device 1 and Web Device 2.
- Bob — Android Device 1 and Android Device 2.
- Carol — iOS Device 1.

Synthetic credentials must be generated inside the isolated PoC. No real identity or account mapping.

## 7. Pass criteria

A candidate is not compatible merely because it compiles. It must pass protocol tests, cross-implementation exchange, real target runtime tests, state persistence, device lifecycle, offline/replay tests, and metadata leakage inspection. Any untested platform is BLOCKED, not PASSED.

## 8. Current blockers

- Rust/Cargo toolchain not yet verified after installation attempt.
- No confirmed Android SDK/emulator or physical device.
- iOS testing requires macOS/Xcode, which is not available from the inspected Windows environment.
- Repository does not currently contain a mobile app workspace, so the eventual React Native/Expo runtime and bridge are not yet defined.
- No candidate commit SHAs have yet been pinned in the isolated environment.

**Current result: plan and isolation established; protocol tests NOT STARTED.**
