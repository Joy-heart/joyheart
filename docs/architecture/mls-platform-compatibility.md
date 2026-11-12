# MLS Platform Compatibility Matrix

**Status:** BLOCKED — no runtime compatibility test has passed.

## JoyHeart repository reality
The inspected main branch is a single web application package. Root package uses React 19, Vinext/Cloudflare and Supabase. There is no `apps/mobile/package.json`, no `apps/web/package.json` at the checked paths, and no declared Expo/React Native application workspace. The PoC must not invent a mobile runtime.

## Candidate support evidence

| Candidate | Web/WASM | Android | iOS | Notes |
|---|---|---|---|---|
| mls-rs | Project advertises WASM builds; exact browser crypto-provider support must be validated | Native Rust bridge not demonstrated in this project | Native Rust bridge not demonstrated in this project | Project warns no full third-party audit; Web Crypto provider marked experimental/unsupported in published matrix |
| OpenMLS v0.9.0 | WASM target is built on CI but documented unsupported/not tested | Android targets built on CI but documented unsupported/not tested | iOS target built on CI but documented unsupported/not tested | Do not interpret build targets as runtime support |
| ts-mls | TypeScript/browser implementation | No approved native runtime evidence | No approved native runtime evidence | Explicitly unaudited; comparator only |
| Signal libsignal | TypeScript API exists | Java API exists | Swift API exists | External use unsupported by maintainers |

## Actual runtime requirements

### Web
- Record browser name/version and OS.
- Test WASM instantiation, WebCrypto provider, worker usage, CSP, reload, offline and state persistence.
- Verify secrets never enter localStorage or logs in plaintext.
- Test browser storage clear/rollback and multiple tabs.

### Android
- Requires an actual Android SDK/device or emulator and a selected native app runtime.
- Test ABI, NDK/Rust target, JNI/UniFFI/bridge boundary, Android Keystore, backup rules, app kill/restart and low-memory behavior.
- No Android test evidence exists yet.

### iOS
- Requires macOS with Xcode, simulator or physical device and a selected native app runtime.
- Test Rust target, FFI boundary, Keychain accessibility, backup exclusions, app termination and background lifecycle.
- Windows host cannot run Xcode/iOS simulator. No iOS test evidence exists yet.

## Required status semantics
- Build success: build only.
- Runtime pass: executed on named runtime/device and exchanged protocol messages.
- Interoperability pass: independently built implementations exchanged and authenticated messages.
- Platform unavailable: BLOCKED, never PASSED.

## Current results
Web runtime: NOT STARTED. Android runtime: BLOCKED. iOS runtime: BLOCKED. Cross-platform interoperability: NOT STARTED.
