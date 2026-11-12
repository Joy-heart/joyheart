# MLS PoC Threat Model

**Status:** Draft for isolated experimentation; not a production security approval.

## Assets
- Device identity private keys and MLS signing keys.
- KeyPackage private key material.
- MLS epoch secrets, exporter secrets and ratchet state.
- Plaintext messages and attachment content.
- Authenticated device identity bindings.
- Local encrypted protocol-state database.
- Recovery secret, if the user chooses recovery.

## Trust boundaries
- Client process and OS secure storage.
- Browser origin and browser storage.
- Android application sandbox and Android Keystore.
- iOS application sandbox and Keychain.
- Experimental transport harness.
- Local test logs and crash reports.
- Future production Worker, PostgreSQL, Realtime, R2 and push systems (out of scope for this PoC).

## Threats and controls

| Threat | Risk | Required PoC control |
|---|---|---|
| Malicious relay reads message | Plaintext disclosure | Verify only MLS ciphertext crosses test transport |
| Invalid identity binding | Impersonation / MITM | Authenticate credential-to-account binding; verify fingerprints out of band in test |
| Replayed KeyPackage | Duplicate/unauthorized join | Single-use server-side reservation model plus client validation; concurrency/replay tests |
| Malicious Commit / invalid epoch | State desynchronization | Verify MLS authentication and reject invalid transitions |
| Device theft | Future message access | Revoke device, update group membership and prove no future decryptability |
| Local storage extraction | Key/state compromise | OS-backed key wrapping; encrypted state; backup exclusion |
| State rollback | Replay / key reuse / split-brain | Monotonic epoch/counter protection and crash/restart tests |
| Browser XSS / extension compromise | Plaintext and keys exposed | Strict CSP, dependency minimization, origin isolation; residual endpoint risk disclosed |
| Android rooted device | Key extraction | Keystore hardware backing where available; report software-backed fallback |
| iOS compromised device | Key extraction | Keychain accessibility class and device passcode policy; residual endpoint risk |
| Debug logging | Secret leakage | Redaction tests and scans of logs/crash artifacts |
| Malicious dependency | Supply-chain compromise | Pinned commits, lockfiles, license/SBOM and vulnerability review |
| Server metadata correlation | Relationship inference | Minimize identity, timing, IP and size data; document unavoidable metadata |
| Denial of service | Resource exhaustion | Bound message sizes, group sizes, queue depth and parsing work |

## Security invariants
1. Plaintext and private MLS state remain on authorized endpoints.
2. No universal server-held decryption key or key escrow.
3. No plaintext push payloads, logs or analytics.
4. A revoked device cannot decrypt messages created after the revocation epoch.
5. A device's historical plaintext cannot be remotely erased after it has been viewed or copied.
6. Protocol failures must fail closed; no custom cryptography or downgrade.
7. A PoC result does not equal an independent audit.

## Residual risks
- A compromised endpoint can expose content and keys.
- A recipient can screenshot, copy or disclose plaintext.
- Browser local storage cannot provide the same hardware-backed isolation guarantees as native secure enclaves.
- Account authentication and cryptographic identity verification are distinct.
- Metadata is not hidden by MLS.
- No external cryptographic audit has been performed on JoyHeart's exact integration.

## Test evidence required
Capture the synthetic network transcript, ciphertext-only transport inspection, key/log scanning, invalid-message rejection, device revocation, crash/restart and storage-at-rest tests. Do not include secret bytes in evidence.
