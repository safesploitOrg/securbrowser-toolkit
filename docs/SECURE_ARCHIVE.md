# Secure Archive design

## Purpose

Secure Archive produces interoperable password-protected `.7z` files so recipients do not need SecurBrowser to open the result. Compatible desktop 7z software can decrypt the archive using the same passphrase.

## Runtime

Secure Archive uses **sevenzip-wasm 26.3.0**, built from **7-Zip 26.03**.

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

Filename encryption is mandatory; the UI does not expose a switch to disable it. If the post-creation wrong-password listing unexpectedly succeeds, SecurBrowser fails closed and does not offer the archive for download.

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

Passphrases are passed to the local 7-Zip-compatible process in the worker as an argument. They are not intentionally logged or persisted. Captured engine output is redacted for the active passphrase, and user-facing errors do not expose command arguments.

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

Older 24.x and 25.x WebAssembly builds were evaluated during development but are not shipped in v2.1.0. The selected 26.03 build is deliberately post-26.01 parser-fix work.
