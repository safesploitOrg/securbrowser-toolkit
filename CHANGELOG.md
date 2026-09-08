# Changelog

## 2.1.0 - 2026-09-08

### Added

- Secure Archive mode for standard encrypted 7z creation.
- AES-256 7z encryption with mandatory encrypted headers/filenames (`-mhe=on`).
- Multiple-file and folder selection for archive creation.
- Store/Fast/Normal/Maximum compression presets.
- Post-creation 7z integrity verification before download.
- Post-creation verification that archive filenames cannot be listed with an incorrect passphrase.
- Secure Archive decrypt/extract workflow.
- Archive signature, unsafe-path, input-size, expansion-size, metadata-output and entry-count checks.
- Symbolic/special-entry skipping during archive result collection.
- Individual extracted-file downloads and File System Access API directory saving where supported.
- Pinned sevenzip-wasm 26.3.0 / 7-Zip 26.03 runtime preparation with immutable-release SHA-256 verification.
- Archive utility and Playwright archive round-trip tests.
- Repository layout check with explicit original-layout removal instructions.
- Secure Archive architecture and third-party licence documentation.

### Changed

- GitHub Actions upgraded to Node.js 24-capable action majors and Node.js 24 runtime.
- GitHub Pages workflow now prepares the pinned sevenzip-wasm runtime before publishing `/public/`.
- Frontend navigation now separates Secure File and Secure Archive workflows.
- Archive engine selection moved away from older 24.x/25.x WASM builds to a 7-Zip 26.03 build so browser extraction does not knowingly ship a superseded parser.

### Fixed

- CI no longer reports a wall of trailing-whitespace errors when obsolete root `assets/`/`index.html` remain; the layout check reports the required `git rm` migration instead.

## 2.0.0 - 2026-09-08

### Added

- Versioned SecurBrowser v2 file format.
- PBKDF2-HMAC-SHA512 key derivation.
- AES-256-GCM authenticated encryption.
- Legacy `Salted__` AES-CBC decryption support.
- `/public/` web-root layout.
- Modular browser JavaScript.
- Unit and Playwright tests.
- GitHub Actions CI and Pages deployment.
- Responsive accessible frontend.
