# Contributing to SecurBrowser Toolkit

## Development setup

```bash
git clone https://github.com/safesploitOrg/securbrowser-toolkit.git
cd securbrowser-toolkit
npm install --ignore-scripts --no-audit --no-fund
npm run build:public
npm run dev
```

The deployable application belongs exclusively under `public/`. Do not recreate root `index.html` or root `assets/`.

## Before submitting a change

Run:

```bash
npm run layout:check
npm run deps:production
npm run style:check
npm run lint
npm run validate:html
npm run test:unit
npm run test:e2e
```

### Secure File changes

Cryptographic and file-format logic should remain separate from DOM code and have deterministic unit tests where practical. Changes to the v2 file format require explicit compatibility/migration consideration.

### Secure Archive changes

Do not disable filename/header encryption for archives produced by SecurBrowser.

Archive parsing/extraction must treat filenames, paths and size metadata as untrusted input. Changes should preserve:

- traversal/absolute-path rejection;
- entry and expansion limits;
- worker/virtual-filesystem isolation;
- fresh runtime verification of generated archives;
- passphrase redaction from captured output;
- real 7-Zip integration tests.

The pinned 7-Zip runtime is configured in `scripts/7z-vendor-config.mjs`. Do not update the upstream commit/hashes without reviewing the new upstream source/build, licences and running the full integration/browser suite.

## Code conventions

- Modern ECMAScript modules.
- `const`/`let`; no implicit globals.
- No inline event handlers.
- Semantic and accessible HTML.
- CSS Grid/Flexbox rather than table-like layout classes.
- Keep runtime dependencies small and auditable.

## Security reports

Do not file public issues for vulnerabilities that could put users at immediate risk. See `SECURITY.md` and contact `security@safesploit.com`.

## Licence

Contributions to SecurBrowser Toolkit are accepted under the repository's MIT Licence. Third-party code retains its upstream licence.
