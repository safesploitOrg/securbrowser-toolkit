# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately to `security@safesploit.com` and include reproduction steps, affected browser/version, sample files where safe, and the expected impact.

Please avoid publishing exploitable details before maintainers have had an opportunity to investigate and release a fix.

## Security model

SecurBrowser is a static browser application. It does not require an application backend to receive selected files or passphrases.

This reduces server-side exposure, but it does not make the hosting origin irrelevant: a compromised server, DNS path, account, CI pipeline or browser extension could replace or interfere with JavaScript delivered to the browser. Use HTTPS, strong repository controls and a trusted endpoint for sensitive work.

## Secure File

New `.enc` files use the SecurBrowser v2 format:

- KDF: PBKDF2-HMAC-SHA512.
- Iterations: 220,000.
- Salt: 16 random bytes.
- Cipher: AES-256-GCM.
- Nonce: 12 random bytes.
- Authentication tag: 16 bytes.
- File-format metadata is authenticated as GCM additional authenticated data.
- Random values come from `crypto.getRandomValues()`.

The iteration count is stored in the file header so future versions can change the work factor without preventing decryption of existing files. Parsers enforce supported work-factor bounds before performing expensive derivation.

### Legacy Secure File decryption

Legacy files beginning with `Salted__` remain supported for migration. They use the historical PBKDF2-SHA256/AES-CBC construction and **do not provide authenticated integrity**. A wrong password can occasionally produce padding-valid garbage, and ciphertext modification cannot be reliably detected.

New encryption never creates the legacy format.

## Secure Archive

Secure Archive is intentionally interoperable rather than cryptographically identical to Secure File.

- Output/input format exposed by the UI: 7z only.
- Content encryption: AES-256 as implemented by 7-Zip.
- Header/filename encryption on creation: always enabled with `-mhe=on`.
- Runtime: pinned sevenzip-wasm 26.3.0, built from 7-Zip 26.03.
- Execution: local classic Web Worker with an isolated Emscripten virtual filesystem.
- Newly created archives are tested with a fresh 7-Zip WASM runtime before download is enabled.
- Creation also verifies that listing the archive with an intentionally incorrect passphrase fails, so an archive is not offered for download if header encryption is unexpectedly absent.

The 7z password derivation and encrypted-container format are defined by 7-Zip. Secure Archive therefore does **not** use SecurBrowser's PBKDF2-HMAC-SHA512 + AES-GCM file construction. This is required for ordinary 7z-compatible software to open the result.

### Archive extraction hardening

A `.7z` supplied for extraction is untrusted input. SecurBrowser therefore:

1. rejects files larger than the configured 1 GiB browser input ceiling;
2. validates the 7z signature before invoking the archive engine;
3. lists technical metadata with the supplied passphrase before extraction;
4. fails closed if the technical listing exceeds its inspection-output budget;
5. rejects absolute paths, drive-qualified paths and `..` traversal;
6. limits declared entries to 2,000;
7. limits declared uncompressed file data to 1 GiB;
8. extracts only into an Emscripten virtual filesystem inside a dedicated worker;
9. skips symbolic links and special entries when collecting results;
10. re-checks the actual collected file count and byte total after extraction;
11. writes to the user's real filesystem only after an explicit save/download action.

The runtime is pinned to 7-Zip 26.03. Older 24.x and 25.x browser builds evaluated during development were deliberately rejected once newer upstream parser fixes were available. The 7z-only format restriction, path validation, size ceilings and virtual-filesystem containment remain in place as defence in depth.

These controls reduce archive traversal/expansion risk but cannot eliminate browser memory exhaustion or all archive-parser vulnerabilities. For hostile archives requiring strong isolation or forensic handling, use an appropriately sandboxed native workflow instead.

## Archive runtime supply chain

Secure Archive does not load runtime code from a CDN.

[`scripts/sevenzip-vendor-config.mjs`](scripts/sevenzip-vendor-config.mjs) pins:

- sevenzip-wasm `26.3.0`;
- upstream 7-Zip 26.03;
- immutable GitHub release asset `sevenzip-wasm.zip`;
- exact release asset SHA-256 `db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243`;
- source/tag commit `b4406198ad5399dc277cc13ab288f54b676aa411`.

`npm run build:public` verifies the release ZIP before extracting `sevenzip-wasm.js`, `sevenzip-wasm.wasm` and the upstream licence into `public/vendor/sevenzip-wasm/`. `npm run vendor:sevenzip:check` verifies the resulting local manifest/assets. The deployed application then uses only these same-origin files.

Generated vendor content is excluded from repository style/formatting checks but exercised by browser end-to-end tests after the build step.

See `THIRD_PARTY_NOTICES.md` for upstream licence details.

## Passphrases

- Secure File creation currently requires at least 8 characters for compatibility with the existing UI; longer unique passphrases are strongly recommended.
- Secure Archive creation requires at least 12 characters; longer unique passphrases are strongly recommended.
- NUL characters are rejected for 7z passphrases because the archive engine is command-line compatible internally.
- Passphrases are not intentionally persisted to localStorage, sessionStorage, IndexedDB or cookies.
- Archive worker output is redacted for the active passphrase and raw 7-Zip command arguments are not presented to users.

## Memory and large files

Current Secure File operations read the complete file into browser memory.

Secure Archive uses an in-memory Emscripten filesystem and may have several copies of input, output and extracted data in memory. The configured 1 GiB ceilings are defensive maximums rather than a promise that every device can process data at that size.

For very large or highly sensitive data sets, native 7-Zip or another audited native tool is preferable.

## Browser requirements

Secure File requires:

- Web Crypto `SubtleCrypto`;
- `crypto.getRandomValues`;
- `File`, `Blob` and object URLs.

Secure Archive additionally requires:

- WebAssembly;
- Web Workers;
- locally served `sevenzip-wasm.js` and `sevenzip-wasm.wasm` assets;
- the `.wasm` file to be served as `application/wasm`.

Saving extracted directory trees directly uses the optional File System Access API. Individual downloads remain available when that API is absent.

## Security headers

The included development server demonstrates restrictive headers including CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`.

Because Secure Archive executes WebAssembly, the CSP permits `'wasm-unsafe-eval'` in `script-src`. This enables WebAssembly compilation without enabling general JavaScript `'unsafe-eval'`.

Production hosting should configure equivalent HTTP headers. A meta CSP in `public/index.html` provides defence in depth, but HTTP headers are preferred.

## Non-goals

SecurBrowser is not:

- a password manager;
- a key escrow/recovery service;
- a cloud-storage provider;
- protection against a compromised browser/endpoint;
- a substitute for organisation-specific data handling requirements;
- a general-purpose archive viewer for every format supported internally by 7-Zip.
