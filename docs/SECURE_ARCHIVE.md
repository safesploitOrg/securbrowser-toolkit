# Secure Archive design

## Purpose

Secure Archive produces interoperable password-protected `.7z` files so recipients do not need SecurBrowser to open the result. Compatible desktop 7z software can decrypt the archive using the same passphrase.

## Runtime

Secure Archive uses **sevenzip-wasm 26.6.0**, built from **7-Zip 26.06**.

The upstream package is the 7-Zip `Alone2` bundle compiled with Emscripten and exposes the normal `SevenZipWasm()`, MEMFS and `callMain()` interfaces. SecurBrowser runs it exclusively inside a dedicated Web Worker and creates a fresh runtime for each command lifecycle.

The immutable GitHub release ZIP is pinned by SHA-256 and expanded locally during `npm run build:public`; the running application never loads the engine from a CDN.

## Creation flow

```text
Selected browser File objects
        |
        v
Archive Web Worker
        |
        +-- stage files into isolated Emscripten FS
        |
        +-- sevenzip-wasm / 7-Zip
        |     - 7z output
        |     - AES-256 encryption
        |     - -mhe=on encrypted headers/filenames
        |     - selected compression level
        |
        +-- fresh runtime tests output archive with password
        |
        +-- fresh runtime attempts listing with a random wrong password
        |     - listing must fail
        |
        v
Verified .7z Blob --> browser download
```

Filename encryption is mandatory; the UI does not expose a switch to disable it. If the post-creation wrong-password listing unexpectedly succeeds, SecurBrowser fails closed and does not offer the archive for download. The correct-password test also checks the exact regular-file paths and sizes.

### Single-item header compatibility

The pinned upstream engine disables header compression for fewer than two items but still encrypts the header when `-mhe=on`. Its build sets `DISABLE_EXCEPTION_CATCHING=1`; a wrong password against the AES-only header can therefore abort the WASM runtime instead of returning fatal exit code 2. This was reproduced using a synthetic 154-byte extensionless file at all four supported compression levels; two-file archives used the normal error-code path.

The correction does not rebuild or replace the vendor engine. The normal wrong-password listing must return exit code 2 without emitting the entry section. Only for a newly generated archive with one selected file, the exact observed Emscripten undefined-abort exception may additionally be handled by a bounded, independent outer-header verifier, after the correct-password integrity and exact entry checks have passed. The verifier checks the 7z signature/version, start/next-header CRCs, exact archive bounds, one packed stream, one inline folder/coder, the 7zAES method ID and pinned engine properties (2^19 SHA-256 cycles and a 16-byte IV), encrypted block alignment, decoded-size consistency, the required decoded-header CRC field and no extra metadata. It does not decrypt independently or prove ciphertext authenticity; CRCs are not cryptographic MACs. Unexpected layouts, unrelated aborts, successful wrong-password listings and entry disclosure fail closed. This narrowly scoped generated-output check is not used to parse untrusted external archive headers during extraction. No extra files are inserted.

References: [upstream single-item header behaviour](https://github.com/ip7z/7zip/blob/d3296e39e1f1f92c7b41c0c3848e65640428d42d/CPP/7zip/Archive/7z/7zHandlerOut.cpp#L737-L779), [pinned Emscripten build flags](https://github.com/arktronic/sevenzip-wasm/blob/eba9a8492d7b5c4c673b69314a6b75eb81f75742/7zip-26.05.patch), [7z format](https://github.com/ip7z/7zip/blob/d3296e39e1f1f92c7b41c0c3848e65640428d42d/DOC/7zFormat.txt). Review the narrow compatibility check whenever the engine changes; a future engine built with working C++ exception handling is preferable to this fallback. Native 7-Zip wrong-password listing and extraction/byte verification remain mandatory.


## Extraction flow

```text
Selected .7z
   |
   +-- reject oversized input
   +-- validate 7z signature
   |
   +-- fresh runtime lists technical metadata with password
   |     - reject wrong password/damaged archive
   |     - fail closed if metadata output exceeds inspection budget
   |     - reject absolute/drive-qualified paths
   |     - reject .. traversal
   |     - enforce entry limit
   |     - enforce declared expansion limit
   |
   +-- fresh runtime extracts into /out in virtual FS
   |
   +-- walk /out only
   |     - skip symbolic links and special entries
   |     - re-check actual file count and bytes
   |
   v
Download individual files / save directory tree
```

The virtual filesystem exists inside the worker. Archive extraction does not write directly to the user's real filesystem. The optional "Save all to folder" operation occurs only after extraction and requires an explicit browser permission prompt where that API is supported.

## Limits

Current defensive limits:

- Maximum selected input for archive creation: 1 GiB and 2,000 files.
- Maximum archive file accepted for browser extraction: 1 GiB.
- Maximum declared extracted file data: 1 GiB.
- Maximum extracted regular files: 2,000.
- Maximum technical listing capture: 50,000 lines; exceeding it aborts inspection rather than silently truncating safety metadata.

These are safety ceilings, not performance targets. Because the WebAssembly filesystem and browser Blobs can create additional copies, substantially smaller archives may still exceed memory limits on constrained devices.

## Password handling

Passphrases are passed to the local 7-Zip-compatible process in the worker as an argument. They are not intentionally logged or persisted. Raw captured engine output is restricted to internal metadata processing; user-facing errors do not expose command arguments.

NUL characters are rejected because the WebAssembly engine retains command-line-compatible argument semantics.

Archive creation requires at least 12 characters in the SecurBrowser UI. This is a usability guard rather than a claim that every 12-character password is strong; users should prefer long, unique passphrases.

## 7z cryptography

Secure Archive uses the cryptography defined by 7-Zip. It does **not** reuse Secure File's PBKDF2-HMAC-SHA512/AES-GCM construction.

The purpose of Secure Archive is interoperability. Altering the standard 7z cryptographic format would prevent normal 7z applications from opening the result.

## Supported archive format

The UI intentionally accepts and creates **7z only** even though the underlying 7-Zip code supports additional formats. SecurBrowser validates the 7z signature before extraction and does not expose RAR, ZIP or other handlers through Secure Archive.

## Updating the engine

The archive parser is a security-sensitive dependency. Upgrade sevenzip-wasm/7-Zip deliberately rather than floating to an unpinned latest release:

1. review the upstream release and embedded 7-Zip version, including relevant parser advisories;
2. update the release URL, source commit and exact SHA-256 in `scripts/sevenzip-vendor-config.mjs`;
3. review upstream licence changes;
4. run unit and three-browser end-to-end tests;
5. test archive interoperability with native 7-Zip where practical.

Older 24.x and 25.x WebAssembly builds were evaluated during development but are not shipped in v2.1.0. The v2.2.0 candidate advances from 26.03 to 26.06; execution and interoperability verification remain required.

## Candidate hardening and verification

The worker forces the 7z handler, separates raw internal listing data from user diagnostics, rejects ambiguous sizes and path collisions, compares extracted entries with preflight metadata, and enforces a five-minute worker timeout. Actual decompressor allocations before collection remain a limitation. `scripts/test-7z-interop.sh` exercises the same WASM path with a native `7zz` or `7z` executable, using synthetic fixtures in both directions. See `testing.md`.
