# MLS Compatibility PoC Results

**Status:** BLOCKED — isolated directory exists, but no MLS protocol test has been executed or passed yet.  
**Isolation:** `C:\\Temp\\joyheart-mls-compatibility-poc` on EMPIRE (Windows).  
**Production impact:** none; no production files, dependencies, databases, secrets or services changed.

## 1. Test execution summary

| Test course | Status | Evidence |
|---|---|---|
| 01 Protocol conformance | NOT STARTED | Rust toolchain and pinned source revisions not yet verified |
| 02 Cross-platform interoperability | BLOCKED | No independent client builds yet |
| 03 One-to-one conversations | NOT STARTED | No MLS client harness yet |
| 04 Group conversations | NOT STARTED | No MLS client harness yet |
| 05 Multi-device support | BLOCKED | Device/runtime harness not available |
| 06 KeyPackage security | NOT STARTED | No test harness yet |
| 07 Offline and recovery | NOT STARTED | No persisted MLS state harness yet |
| 08 Secure local storage | BLOCKED | Platform-specific storage adapters not selected |
| 09 Metadata and leakage | NOT STARTED | No networked isolated harness yet |
| 10 Performance | NOT STARTED | No benchmark measurements |

## 2. Environment evidence

- Repository `package.json`: no MLS dependency.
- Repository root has a single web application package; inspected `apps/mobile/package.json` and `apps/web/package.json` paths were not found.
- Git: 2.54.0.windows.1.
- Node: v24.16.0.
- npm: 11.13.0.
- Initial `rustc --version` check returned “not recognized”; the Rustup installation attempt did not result in a verified toolchain, and a subsequent check still returned “not recognized”.
- The isolated directory `C:\\Temp\\joyheart-mls-compatibility-poc` was successfully created on EMPIRE.
- A shallow clone of mls-rs was started from that directory but did not complete within the available remote execution window; no source commit was pinned and no build was run.
- An npm registry metadata lookup for ts-mls did not complete; no package was installed.
- No ADB, Android emulator, iOS simulator, browser test or MLS runtime result has been captured.

## 3. Candidate observations (research, not test results)

- mls-rs project advertises RFC 9420 conformance, WASM builds and precomputed test-vector tests, but says it has not received a full third-party security audit.
- OpenMLS v0.9.0 is the latest release found during research. Its project says Android, iOS and WASM targets are built on CI but unsupported/not tested.
- ts-mls explicitly says it has not received a formal security audit.
- Signal libsignal external use is explicitly unsupported by its maintainers.

## 4. Failures and limitations

No test failure can yet be reported because no MLS test was executed. This is not a pass. Platform support is unproven. The current JoyHeart repository has no mobile workspace, so the target mobile integration cannot be accurately demonstrated until the app runtime is selected.

## 5. Final status

**BLOCKED from declaring PoC success.** Continue only in the isolated workspace. Do not approve a production dependency or implement live messaging from these research observations.
