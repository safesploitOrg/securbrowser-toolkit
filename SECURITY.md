# Security policy

## Reporting a vulnerability

Please report security vulnerabilities privately to **security@safesploit.com**. Include reproduction steps, affected components and expected impact where possible. Avoid public disclosure until the issue can be investigated and a fix coordinated.

## Security properties of v2 files

SecurBrowser v2 uses only the browser's native Web Crypto API at runtime.

| Property | v2 design |
| --- | --- |
| Password KDF | PBKDF2-HMAC-SHA512 |
| New-file work factor | 220,000 iterations |
| Salt | 16 random bytes from `crypto.getRandomValues()` |
| Cipher | AES-256-GCM |
| Nonce | 12 random bytes from `crypto.getRandomValues()` |
| Authentication tag | 16 bytes / 128 bits |
| Authenticated metadata | Yes, v2 header + salt + nonce are AES-GCM AAD |
| Production JavaScript dependencies | None |

The iteration count is stored in each v2 file. The parser accepts 220,000 to 5,000,000 iterations so the work factor can rise in future versions without losing decryption compatibility, while bounding attacker-controlled KDF cost.

The current 220,000 PBKDF2-HMAC-SHA512 work factor follows the contemporary [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) baseline for PBKDF2-HMAC-SHA512. Because client hardware varies, maintainers should periodically review this value rather than treating it as permanent.

## Authenticated encryption

AES-GCM provides confidentiality and authentication. The v2 format passes its complete metadata block to Web Crypto as Additional Authenticated Data (AAD). Therefore a wrong passphrase or modification of the header metadata, salt, nonce, ciphertext or authentication tag causes v2 decryption to fail.

The application never reuses a nonce intentionally: a fresh 96-bit nonce and 128-bit salt are generated for every encryption operation.

## Legacy compatibility

Files produced by the original application begin with `Salted__` and use:

- PBKDF2-HMAC-SHA256
- 10,000 iterations
- 8-byte salt
- 256-bit AES key derived from the first 32 bytes of PBKDF2 output
- 128-bit CBC IV derived from the remaining 16 bytes
- AES-256-CBC

This format does **not** provide authenticated integrity. Legacy decryption is retained only so existing data is not stranded. The UI explicitly warns after legacy decryption and recommends re-encrypting with v2 when practical. New encryption never writes the legacy format.

See [docs/FILE_FORMAT.md](docs/FILE_FORMAT.md) for the exact layouts.

## Threat model

SecurBrowser is designed to protect a file at rest when the user chooses a strong passphrase and uses a trustworthy browser/application copy.

It is designed so the hosted application does not need to receive plaintext files or passphrases.

It does **not** protect against:

- a compromised endpoint or browser process
- malicious or over-privileged browser extensions
- keylogging or screen capture
- a maliciously modified copy of the application
- an attacker able to execute script in the application origin
- weak/reused passphrases and offline guessing against a captured encrypted file
- denial of service through extremely large input files

## Static hosting security

Where the hosting platform permits response headers, use:

- Content Security Policy with `default-src 'self'` and `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` as a compatibility fallback for framing protection
- `Referrer-Policy: no-referrer`
- a restrictive `Permissions-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- HTTPS

`public/index.html` also includes a restrictive CSP meta policy as defence in depth. Header-delivered CSP remains preferable and can enforce directives such as `frame-ancestors`.

## Dependency and CI security

The deployed application has zero npm dependencies. Development tooling is isolated outside `public/`.

GitHub Actions are pinned to full commit SHAs, workflows declare explicit least-privilege permissions, and Dependabot is configured for both npm development dependencies and GitHub Actions.

## Cryptographic changes

Changes to algorithms, file-format identifiers, nonce generation, KDF parameters or authenticated metadata should include:

1. unit tests for round trip and failure cases;
2. tamper-detection tests;
3. backward-compatibility tests where applicable;
4. documentation updates to this file and `docs/FILE_FORMAT.md`;
5. browser tests in Chromium, Firefox and WebKit.
