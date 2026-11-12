# JoyHeart MLS Recovery Design

**Status:** Design proposal; recovery is not implemented or tested.

## Security objective
Allow a user to migrate or recover their messaging identity without giving JoyHeart, Cloudflare, Supabase, support staff or a storage provider a universal decryption key.

## Preferred approach: trusted-device transfer
1. A currently trusted device starts a transfer session.
2. New device displays a short-lived QR code or pairing challenge.
3. Existing device verifies the new device and user confirms the transfer.
4. A vetted protocol establishes an authenticated, end-to-end protected channel.
5. Only the minimum required state is transferred; new device is registered and visible in device inventory.
6. MLS membership/key state is updated and the new device joins through protocol-defined operations.
7. Transfer tokens expire and are single-use.

## Alternative: user-held recovery material
- Generate high-entropy recovery material client-side.
- Derive a wrapping key using a vetted KDF and strong parameters; encrypt a client-side backup with an authenticated encryption construction from a vetted library.
- The service may store only ciphertext and non-secret metadata; the recovery secret must never be sent to the service in plaintext.
- Warn users that losing all devices and recovery material can make old messages unrecoverable.
- Recovery must be rate-limited and designed to resist offline guessing; a short PIN alone is not adequate.

## What recovery must not do
- No server master decryption key.
- No silent key escrow.
- No plaintext export to support.
- No automatic device enrollment without user-visible approval.
- No false promise that recovered state can erase historical copies from a lost device.

## Unresolved decisions
- Whether recovery restores only account/device identity or also historical message state.
- Whether users may choose no message backup.
- Recovery phrase format, entropy, KDF and encrypted backup format.
- How group membership and epoch state are re-established after full device loss.
- What happens when all devices are lost and no recovery material exists.

## Required tests
Trusted-device transfer; tampered pairing QR; expired/replayed pairing; recovery secret wrong/low entropy; encrypted backup tampering; recovery after lost devices; old device revocation; recovery state replay; crash during restore. All tests use synthetic identities only.
