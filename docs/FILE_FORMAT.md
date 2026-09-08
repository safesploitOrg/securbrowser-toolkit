# SecurBrowser encrypted file format

## Version 2

New files are written in the SecurBrowser v2 binary format. Multi-byte integers use network byte order (big-endian).

| Offset | Size | Field | Value |
| ---: | ---: | --- | --- |
| 0 | 4 | Magic | ASCII `SBTK` |
| 4 | 1 | Version | `0x02` |
| 5 | 1 | KDF ID | `0x01` = PBKDF2-HMAC-SHA512 |
| 6 | 1 | Cipher ID | `0x01` = AES-256-GCM |
| 7 | 1 | Flags | `0x00` |
| 8 | 4 | PBKDF2 iterations | Currently `220000` |
| 12 | 1 | Salt length | `16` bytes |
| 13 | 1 | Nonce length | `12` bytes |
| 14 | 1 | GCM tag length | `16` bytes |
| 15 | 1 | Reserved | `0x00` |
| 16 | 16 | Salt | Random per encryption |
| 32 | 12 | Nonce | Random per encryption |
| 44 | variable | Ciphertext + GCM tag | Web Crypto AES-GCM output |

The first 44 bytes are passed to AES-GCM as Additional Authenticated Data (AAD). This authenticates the algorithm identifiers, work factor, salt and nonce as well as the encrypted payload.

### Key derivation

1. Encode the passphrase as UTF-8.
2. Import it as PBKDF2 key material.
3. Derive a 256-bit AES-GCM key with PBKDF2-HMAC-SHA512.
4. Use the iteration count stored in the file header. New files currently use 220,000 iterations.

The parser accepts iteration counts from 100,000 through 5,000,000. This permits future work-factor increases while rejecting unexpectedly small values and bounding attacker-controlled KDF cost during decryption.

### Encryption

- AES-256-GCM
- 96-bit random nonce
- 128-bit authentication tag
- 128-bit random PBKDF2 salt
- Header + salt + nonce authenticated as AAD

A wrong passphrase or modification of authenticated metadata/ciphertext causes GCM authentication to fail.

## Legacy version 1 compatibility

Earlier SecurBrowser files have this layout:

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 8 | ASCII `Salted__` |
| 8 | 8 | PBKDF2 salt |
| 16 | variable | AES-CBC ciphertext |

Legacy derivation uses PBKDF2-HMAC-SHA256 with 10,000 iterations to produce 384 bits. The first 256 bits are the AES key and the remaining 128 bits are the CBC IV.

Legacy decryption is retained for compatibility only. AES-CBC in this format does not authenticate the encrypted file, so successful decryption cannot establish ciphertext integrity. New files are never written in the legacy format.
