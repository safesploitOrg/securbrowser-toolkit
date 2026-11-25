# Candidate verification — 25 November 2026

Source: v2.2.0-rc.1 supplied archive, based on reviewed main `a24ae4e24d5a3f193b33e3b0d76533ee211031a3`; local source candidate v2.2.0-rc.2. Profiles B+D; T2. No remote mutation, production release or policy exception.

| Check | Result | Evidence |
| --- | --- | --- |
| RC.1 baseline | PASS | `npm run check:offline`, 53/53 unit tests on installed Node 22.16.0. |
| RC.2 offline gate | PASS | `npm run check:offline`, 57/57 unit tests, layout, style, structural HTML and crypto self-test on Node 22.16.0. |
| New lockfile validation | PASS | Three synthetic unit cases exercise valid metadata and stale, missing, untrusted or integrity-invalid metadata; not actual npm resolution. |
| Workflow policy | PASS (unit/static) | Checks for read-only bootstrap, action SHA pins and exact-commit deployment gate. Actual Actions not executed. |
| Native negative controls | NOT RUN | `bash scripts/test-7z-interop.sh` exits 1 because `7zz`/`7z` is absent. |
| WASM build | FAIL (environment) | `npm run build:public` exits 1, `EAI_AGAIN github.com`. No binary substituted. |
| npm registry | FAIL (environment) | `npm view @playwright/test@1.63.0 version` with bounded timeout fails `EAI_AGAIN registry.npmjs.org`. |
| Lockfile and npm ci | BLOCKED | `npm run lockfile:check` fails with missing lock; `npm ci` exits with EUSAGE. No fabricated lock. |
| Pinned Node runtime | NOT AVAILABLE | Node 22.16.0 installed; bootstrap refuses runtime other than 26.8.1. |
| Static server | PASS | Loopback HTTP 200 and CSP header present. |
| Real browser execution | BLOCKED | Chromium navigation to loopback returns `ERR_BLOCKED_BY_ADMINISTRATOR`. |
| HTML-Validate, ESLint, Playwright, axe | NOT RUN | Required packages unavailable. |
| CodeQL, Gitleaks, dependency audit | NOT RUN | Connected-runner jobs configured; no real scan results. |
| Human T2 approval, branch/environment protection | PENDING | Owner must record exact-commit review and configure controls. |

The application under `public/` is byte-for-byte unchanged from RC.1; no new rendered UI verification is claimed. Previous static renders remain reference material only. A connected runner must generate the real lockfile using the new manual bootstrap or local script, commit it after review, execute all mandatory CI gates and record the human release decision. The candidate cannot be represented as a stable or production-ready release.


## Staging CI remediation — 25 November 2026

Observed GitHub run [45660643368](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45660643368), PR #10, staging head `d25cddf6979a153605666919e80475b7b67457e9`: Node 26.8.1, 57/57 unit tests, static HTML, layout, style, Gitleaks and CodeQL passed. The committed lockfile was absent; quality and dependency-audit jobs failed at that prerequisite. HTML-Validate, ESLint, WASM build, browser/axe and native interoperability did not run. The release review and deployment were correctly skipped.

The remediation adds a staging-only push trigger to the read-only bootstrap, preserves the existing lockfile validator and installation checks, and adds a configuration regression test. No runtime application files, dependency versions, release approval conditions or normal CI gates are changed. The revised workflow has not executed on GitHub; the authoring environment still cannot resolve the npm registry. The generated lockfile must be reviewed and committed separately. No remote mutation or human T2 approval is implied.

Local remediation verification: `npm run check:offline` passed with 58/58 unit tests (Node 22.16.0); static HTML, style, layout and crypto self-test passed. Workflow YAML parsed and staging trigger/read-only/artifact condition assertions passed. This is not execution of the revised GitHub workflow.


## Connected staging verification and test corrections — 25 November 2026

Baseline: PR #10, staging head `5903dc40a2fdfb64af2d8b25693310d21aaad9d9`, [GitHub run 45666305045](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45666305045). All 87 source files restored. The [bootstrap run 45663691883](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45663691883) produced the actual lockfile and verified `npm ci`; the committed lockfile is unchanged in this correction.

| Baseline check | Observed result |
| --- | --- |
| Node 26.8.1, lockfile (90 integrity-pinned packages), npm ci | PASS |
| Unit tests | PASS 58/58 |
| HTML-Validate, ESLint, style, layout, Bash syntax | PASS |
| Gitleaks, CodeQL, npm audit at configured threshold | PASS |
| Pinned WASM 26.6.0 build and vendor integrity | PASS |
| Native 7-Zip 26.00 integrity, wrong-passphrase and visible-header/truncation negative controls | PASS |
| Browser/axe matrix | FAIL: 23 passed, 4 failed (password-toggle geometry in three engines and initial system appearance in Firefox) |
| Bidirectional native/WASM interoperability | FAIL: native archive extracted successfully but expected literal octal-escaped filename did not match a UI row; reverse native extraction/comparison not reached |
| Release review/deploy | SKIPPED as intended for PR |

Corrections (B+D; T2 release context, test-only changes): `scripts/test-7z-interop.sh` writes the intended UTF-8 filename using Bash ANSI-C quoting and exposes the fixture writer to an isolated test process; `tests/unit/interop-fixtures.test.js` validates the real fixture tree, names and bytes; `tests/integration/sevenzip-interop.spec.js` checks the independent expected file manifest before running the existing full archive/password/byte assertions. `tests/e2e/ui.spec.js` configures dark media at context creation, waits for actual media-query and computed-style transitions in both directions, and measures document-relative position and dimensions within half a CSS pixel to distinguish real layout movement from automatic scrolling. The Firefox correction is a hypothesis pending actual Firefox execution; a mismatch remains a failing test. No browser, security or interoperability gate is skipped or weakened. Runtime application, workflows, package versions and lockfile are unchanged. Literal POSIX backslashes in filenames are a separate portability risk: archive path normalisation interprets them as separators; this correction does not claim to address that behaviour.

Local verification of the correction: `npm run check:offline` (59/59 unit tests including the genuine Bash UTF-8/binary fixture test), `npm run lockfile:check`, `node --check` for changed JavaScript, and `bash -n` for the harness passed. Full lint, scanners, real browser execution and native/WASM integration have not been rerun on the corrected revision in the restricted authoring environment. All mandatory connected CI gates, manual accessibility review, component advisory review and exact-commit human T2 release approval remain required. No remote mutation, merge, deployment or policy exception.
