# Testing

## Local prerequisites

Use the exact Node version in `.node-version`, npm, native `7zz` or `7z`, and a supported Playwright Chromium/Firefox/WebKit installation. The candidate ZIP is source-only. Generate the missing lockfile once with network access, inspect it, and commit it before CI:

```bash
bash scripts/prepare-lockfile.sh
npm run lockfile:check
npm ci --ignore-scripts --no-audit --no-fund
npm run build:public
npx playwright install --with-deps chromium firefox webkit
```

The optional **Prepare npm lockfile** manual workflow runs the same bootstrap on a connected runner. It installs against the real generated lock in a temporary directory, checks the manifest has not changed and returns the lockfile, source revision, toolchain and hashes as an artifact. Review and commit that lockfile before CI. It has no repository write or deploy permission.

## Commands

```bash
npm run check:offline          # no npm packages, core unit + static checks
npm run check                  # full source quality and pinned runtime preparation
npm run test:e2e:built         # actual browser WASM + UI/axe checks against existing public build
bash scripts/test-7z-interop.sh # native/WASM exchange, fail closed
bash scripts/test-7z-interop.sh --native-only # native diagnostics only; NOT a browser pass
```

Use `SEVENZIP_BIN=/path/to/7zz` to select an executable; otherwise prefer `7zz`, then `7z` on PATH. The harness checks the native engine identity, correct-password listing and exact fatal-error status on incorrect passwords. A deliberately visible-header archive must fail the concealment check, and a truncated archive must fail the native integrity test. The Bash harness prints the actual executable/version, creates a temporary directory with only synthetic data, builds encrypted native fixtures, verifies password/header behaviour, drives the actual browser UI via Playwright, verifies every downloaded byte, then uses native extraction and `diff -r` on the WASM-created archive. It removes only its own temporary directory. Do not supply private data or real secrets. The runner's native version is recorded, not assumed to equal the pinned WASM version.

## Matrix

- Unit: Web Crypto reference envelope, legacy compatibility, wrong passwords, tampering, parser size/path limits, appearance/storage, state cancellation, safe file saving and gate failures.
- Browser: Chromium, Firefox, WebKit; 390x844, 768x1024, 1440x900; both themes, keyboard and reduced motion; axe automated checks. Manual 200% zoom, focus and screen reader review are outstanding.
- Interop: Chromium with actual WASM, native CLI. Synthetic nested directories, binary data, empty and Unicode files, wrong passwords, hidden names, truncated archive, byte comparison in both directions.
- Security: Gitleaks, npm audit and CodeQL SARIF gate. Review vendored component advisories separately; npm audit does not scan the WASM.

A failed or missing mandatory gate blocks release. Local Chromium navigation was blocked by environment policy; screenshots use the actual static source rendered in Chromium, not a successful E2E run. The npm registry, GitHub binary download and native 7-Zip are unavailable in the authoring environment. No Playwright, vendor execution, native interop, full HTML-Validate, ESLint or security scanner pass is asserted.
