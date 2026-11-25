# Changelog

## [2.2.0-rc.2] — 2026-11-25 (candidate, not released)

- Add read-only lockfile bootstrap workflow and reproducible local Bash script, validating actual npm resolution and installation before returning an artifact. Require a committed integrity-pinned lockfile in full CI.
- Strengthen native 7-Zip testing with executable identity, correct-password listing, exact fatal-error checks, visible-header and truncated-archive negative controls, and an explicitly diagnostic native-only mode.
- Retain verification evidence and bind the release review reference to the exact candidate commit. Preserve all mandatory gates and cryptographic/UI behaviour.
- External downloads, native engine, full browser/scanner execution and owner approval remain outstanding in the authoring environment.
- Staging CI remediation: automatically run the read-only lockfile bootstrap when its workflow or inputs change on `staging`, retain an existing lockfile, and return generated artifacts for manual review. Keep the normal CI lockfile gate unchanged.

## [2.2.0-rc.1] — 2026-11-25 (candidate, not released)

- Add native Linux/macOS 7-Zip and browser WASM bidirectional interoperability harness; preserve PBKDF2-SHA512/AES-GCM and legacy decryption.
- Pin sevenzip-wasm 26.6.0 (7-Zip 26.06); verify cached runtime against original pinned ZIP.
- Correct baseline HTML/ESLint findings, add operation cancellation, resource/metadata controls and non-overwrite directory saving.
- Add System/Light/Dark preferences, contrast fixes, dynamic footer and local favicon; add independent crypto and UI tests.
- Add security gates, single-artifact CI promotion and explicit owner-reviewed deployment. Lockfile generation and full CI/runtime verification remain release blockers.

## 2.1.1 - 2026-09-09

### Changed

- GitHub Actions quality, browser and Pages workflows now use the exact Node.js 26.8.1 Current release, `actions/setup-node` v7.0.0 and `actions/checkout` v7.0.1 (all action references pinned by commit SHA).
- Unit tests now use Node.js' built-in `node:test` runner; Vitest has been removed.
- HTML-Validate now layers its Prettier compatibility preset over the recommended rules.
- Password inputs use explicit `new-password`/`current-password` autocomplete tokens.
- CI continues independent HTML, unit, lint and style diagnostics after an earlier check fails.

### Added

- Dependency-free static HTML validation for duplicate IDs, missing references, accessible form labels and local asset paths.
- Explicit CI runtime assertion so logs prove the requested Node.js version was selected.

### Fixed

- HTML validation conflict between Prettier's void-element output and HTML-Validate's default `void-style` expectations.
- Unlabelled hidden folder-picker control in the Secure Archive create workflow.
- Unit-test execution no longer depends on Vitest installation or compatibility.

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
