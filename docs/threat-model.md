# Threat model

Profile B+D; T2. Assets: plaintext, passphrases, encrypted outputs, filesystem data and delivered code. Actors: legitimate users, archive authors, compromised origin/dependency or CI identity, malicious local software/extensions. Boundaries: browser file picker/drag-drop, file envelope parser, archive worker/MEMFS, user-selected directory, same-origin static assets, CI artifact and deployment credentials.

| Threat | Control | Verification / residual risk |
| --- | --- | --- |
| Tampered or wrong-password Secure File | PBKDF2-SHA512 and AES-GCM AAD, KDF bounds, legacy warning | Unit and independent fixture tests; legacy CBC has no integrity. |
| Filename disclosure | Mandatory 7z header encryption; correct and wrong password listing; generated entries match | Actual native/WASM interop required; 7z does not provide GCM-style authenticated encryption. External archive filename and total size remain visible. |
| Hostile archive path or ambiguous metadata | Force `-t7z`; path/depth limits, reject missing/duplicate fields and links, compare inspected vs collected files | Text listing is not a structured API; parser and memory limitations remain; do not treat a Web Worker as strong sandboxing. |
| Resource exhaustion | Input/entry/metadata budgets, worker timeout/termination, bounds before file collection | Decompressor can allocate before post-extraction checks. 1 GiB is a ceiling, not a promise. |
| Stale output or accidental overwrite | Immutable snapshots, exclusive operation, reset invalidation, new random folder and observed collision checks | FileSystem Access lacks atomic exclusive-create; external concurrent changes remain a race. Partial folder may remain. |
| Code substitution or exfiltration | Local assets, CSP, SHA-pinned vendor source ZIP and artifact manifest, no application uploads/storage of task data | HTTPS and trusted origin remain required. No guarantee against compromised hosting, extension or endpoint. |
| CI supply chain compromise | Scoped token, full SHA pins, lockfile and audit gates, SAST and secret detection, same-artifact promotion | Real lockfile committed; enforce all required gates and owner approval before publication. |

Do not publish the candidate until all required T2 checks have run and the owner records approval. See `SECURITY.md`, `testing.md` and `operations.md`.


### CD promotion boundary

The protected `github-pages` environment separates successful main CI from publication. PRs and manual CI runs cannot invoke production promotion. A read-only preparation job uses the CI artifact ID, checks the source SHA and full inventory, packages all tested public files, and records the Pages artifact ID and tar hash. The protected job checks current main, the configured reviewer/branch policy, recorded human approval and artifact visibility/identity; it verifies the downloaded tar hash before publishing. Missing evidence or mismatches fail closed. Owner-managed branch rules, environment protection and substantive T2 review (including the pending browser exception) remain essential; code checks cannot prove administrative settings or review adequacy. GitHub service outages and a narrow race between current-head verification and deployment remain operational risks. No unapproved rollback or repeat publication; use a reviewed revert and the same gated process.
