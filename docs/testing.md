# Testing

## Local prerequisites

Use the exact Node version in `.node-version`, npm, native `7zz` or `7z`, and a supported Playwright Chromium/Firefox/WebKit installation. The candidate ZIP is source-only and includes the GitHub-generated lockfile. If working from a checkout without a lockfile, generate it once with network access, inspect it, and commit it before CI. Bash is also required for the fixture unit test:

```bash
if [[ ! -e package-lock.json ]]; then
    bash scripts/prepare-lockfile.sh
fi
npm run lockfile:check
npm ci --ignore-scripts --no-audit --no-fund
npm run build:public
npx playwright install --with-deps chromium firefox webkit
```

The **Prepare npm lockfile** workflow runs the same bootstrap on a connected runner. It triggers on pushes to `staging` that modify the workflow, bootstrap scripts, `package.json` or `.node-version`. It may also be manually dispatched once available on the default branch. It installs against the real generated lock in a temporary directory, checks the manifest has not changed and returns the lockfile, source revision, toolchain and hashes as an artifact. If a lockfile already exists, the workflow validates it rather than replacing it; normal CI verifies its installation. It has no repository write or deploy permission.

### Bootstrap a staging pull request without merging

1. Commit the updated bootstrap workflow to `staging` and push it. The ordinary CI can still fail on this first push: that is intentional until the lockfile is committed.
2. Open the **Prepare npm lockfile** run for that exact staging commit. Confirm the generation and upload steps passed, then download the `npm-lockfile-candidate` artifact.
3. Inspect `SOURCE_COMMIT`, `TOOLCHAIN` and `package-lock.json`. Copy the reviewed lockfile to the repository root and check both SHA-256 sums using the artifact's `SHA256SUMS` file. On macOS use `shasum -a 256 -c /path/to/extracted/SHA256SUMS` from the repository root; on Linux use `sha256sum -c /path/to/extracted/SHA256SUMS`.
4. Run `npm run lockfile:check` and, using the pinned Node version and network access, `npm ci --ignore-scripts --no-audit --no-fund`. Commit only the reviewed lockfile to `staging` and push. Inspect the new PR CI run; the bootstrap run itself is not release evidence.

If the bootstrap fails, inspect its actual error. Do not remove the committed-lockfile requirement or merge into `main` to trigger the workflow.

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

A failed or missing mandatory gate blocks release. GitHub run [45666305045](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45666305045) verified the restored staging baseline: all quality and security jobs passed, 23/27 browser cases passed, and native 7-Zip diagnostics passed; full browser and bidirectional interoperability jobs failed. The subsequent test corrections must be verified in a fresh CI run. The fixture writer is independently checked for genuine UTF-8 filenames and exact binary bytes without requiring 7-Zip. The browser tests configure the initial OS appearance before page creation, wait for actual media-query and computed-style changes, and measure password-toggle geometry in document coordinates rather than viewport coordinates. See [verification](VERIFICATION.md) for exact revision evidence and remaining limitations.

## Firefox system appearance verification

The connected staging run [45725245514](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45725245514) passed bidirectional native/WASM interoperability, 59/59 unit tests and 26/27 browser cases. Firefox failed at the independent `matchMedia("(prefers-color-scheme: dark)")` assertion: the browser reported light despite the requested dark emulation. This establishes a test-input mismatch, not a demonstrated application theme defect.

The revised Firefox test launches a disposable instance with the native `layout.css.prefers-color-scheme.content-override` preference set to dark (0) and disables Playwright colour-scheme emulation using `colorScheme: null`. It changes the actual Firefox website appearance through the native settings UI, then asserts the real media signal and computed app CSS after each live change. Chromium and WebKit retain Playwright media emulation and the same shared assertions. No browser is excluded, no assertion is weakened, and no production privacy preference is altered. The native settings UI is an additional test-runner compatibility dependency; if inaccessible or ineffective the test fails.

Focused reproduction after the normal build and browser installation:

```bash
npx playwright test tests/e2e/ui.spec.js --project=firefox --grep "system appearance"
```

Run the full matrix afterward. The native Firefox setup has not been executed in the restricted authoring environment.

## General browser CI pause — 26 November 2026

The owner intentionally paused the general browser/axe CI job in staging commit `c216b71b8f5d46c831cecda24fb98a04b82f0209` after [run 45726216033](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45726216033) reported 26/27 browser tests, with the Firefox system-appearance test timing out on both attempts. All browser tests and `npm run test:e2e:built` remain available locally. The native/WASM 7-Zip job still uses real Playwright Chromium and is not paused. The full matrix is NOT RUN in current CI; do not report it as PASS. Separate current-revision evidence or a documented, time-bounded owner-approved Section 14 release exception is required before production release. See [release checklist](RELEASE_CHECKLIST.md).

## CI/CD promotion checks

The unit tests exercise the required-reviewer, branch, current-commit, recorded-approval and artifact identity checks using synthetic API responses. Workflow regression tests assert that every enabled quality/security/interoperability dependency is required, PR/manual CI cannot deploy, the Pages artifact is prepared before human approval, and the deploy job cannot rebuild or upload a replacement artifact. These tests do not prove GitHub environment enforcement. The owner must configure the environment and verify a real successful main run waits for approval; reject/cancel an unapproved candidate and verify the approved candidate's deployment and smoke checks. See [operations](operations.md) for failure/retry behaviour.
