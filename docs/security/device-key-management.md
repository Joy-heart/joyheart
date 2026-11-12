# JoyHeart MLS Device Key Management

**Status:** Design for PoC; not production implementation.

## Identity model
- One JoyHeart account may own multiple registered devices.
- Each device generates its own private identity/signing material locally.
- Each device publishes only protocol-required public credentials and KeyPackages.
- Account authentication does not itself prove possession of an enrolled device key.
- Device registration must bind the account session to a cryptographic proof of possession.

## Enrollment
1. User authenticates to the account.
2. New device generates private keys locally using a vetted library and OS secure storage.
3. Existing trusted device approves the new device through an authenticated QR/short-lived pairing ceremony, or user invokes a separately designed recovery process.
4. Devices verify the new device's public identity and show a clear trust change.
5. Server records public key material, device status and audit metadata only.
6. MLS group membership changes are committed so authorized members learn the new epoch.

## Device inventory
Show device name/type, creation date, last active time, trust status and revocation controls. Avoid exposing raw key material. Notify existing devices about new enrollment.

## Revocation
1. Authenticated account owner selects a device to revoke.
2. Require recent re-authentication and proof from an authorized device.
3. Mark device revoked and reject future API and KeyPackage operations.
4. Perform MLS removal/update commit and verify remaining devices process the new epoch.
5. Test that the revoked device cannot decrypt application messages sent after the revocation epoch.
6. Explain that the revoked device may retain historical plaintext and keys already obtained.

## Multi-device design issue
MLS treats each device as a cryptographic client/member unless an explicit architecture defines account-level identity semantics. Do not assume that adding a second device automatically synchronizes old history. The PoC must compare per-device leaves against an account-as-member abstraction and document security/usability trade-offs.

## Storage
- Web: prefer non-extractable WebCrypto keys where supported; browser storage is still exposed to same-origin script compromise and cannot be equated with hardware-backed native storage.
- Android: wrap local state keys with Android Keystore; require hardware-backed key protection when available and record fallback.
- iOS: use Keychain with an explicit accessibility class and appropriate device-passcode protection; evaluate Secure Enclave only for supported key types/operations.
- Keep MLS state encrypted at rest; exclude secret-bearing state from cloud/device backups unless separately encrypted by a user-held recovery key.
- Clear secrets from memory where practical; do not claim guaranteed zeroization in managed runtimes.

## Acceptance tests
Unauthorized enrollment rejected; approved enrollment succeeds; duplicate device identity rejected; lost device revoked; revoked device receives no future decryptable content; stale state cannot roll back; local state survives normal restart; logs contain no keys.
