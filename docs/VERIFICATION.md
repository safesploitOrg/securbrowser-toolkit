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

## Connected staging verification — 26 November 2026

PR #10, exact staging commit `036ad8de54fedb1c12508a7597b38cec113cf988`, [GitHub Actions run 45725245514](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45725245514).

| Gate | Observed baseline result |
| --- | --- |
| Quality, committed lockfile, unit tests, HTML-Validate, ESLint | PASS; 59/59 unit tests, Node 26.8.1 |
| Gitleaks, CodeQL, npm audit at configured threshold | PASS |
| Pinned WASM build and vendor integrity | PASS; 7-Zip 26.06 |
| Native/WASM interoperability | PASS; native 7-Zip 26.00, both directions, all file bytes and negative controls |
| Browser matrix | FAIL; 26/27 tests, Chromium 9/9, WebKit 9/9, Firefox 8/9 |
| Release review and deployment | SKIPPED for PR |

The remaining Firefox failure occurs before the computed-style assertion: `matchMedia("(prefers-color-scheme: dark)").matches` is false despite dark emulation configured before page creation. Retrying did not resolve it. The application has not been shown to mishandle a real dark media signal. The proposed test-only correction uses a disposable Firefox instance with the native website appearance preference, disables media emulation in that context, changes the actual browser preference via its settings controls, and keeps the same initial and live `matchMedia` and CSS assertions plus storage, manual override, privacy and footer assertions. The native preference is documented in [Firefox source documentation](https://firefox-source-docs.mozilla.org/code-quality/coding-style/css_guidelines.html); Playwright documents [launch preferences](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-firefox-user-prefs) and null colour-scheme emulation. The internal settings UI may vary between Firefox builds; an inaccessible or ineffective control is still a failure, not an exception.

Scope: `tests/e2e/ui.spec.js`, `CHANGELOG.md`, `docs/testing.md`, `docs/VERIFICATION.md`. Profiles B+D, T1 test-harness change in T2 release context. Runtime app, crypto, archive implementation, dependency pins, lockfile and all CI/deployment workflows unchanged. No release approval or policy exception.

Local verification of this correction: `npm run check:offline` (59/59 unit tests and static/layout/style/crypto checks), `npm run lockfile:check` (90 integrity-pinned packages), JavaScript syntax and both Bash harness syntax checks passed. The authoring runtime remains Node 22.16.0; the exact new revision has not run the connected browser, lint, scanner or interoperability jobs. The prior CI passes apply only to the stated baseline commit. Firefox is not installed in this authoring environment. Manual accessibility and component advisory reviews, mandatory CI gates, and human T2 approval remain outstanding before production release.

## Owner-directed browser CI pause — 26 November 2026

Baseline PR #10 staging commit `33003bad4a5c8d0683909ff58984e3731e94148c`, [run 45726216033](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45726216033): quality, dependency audit, Gitleaks, CodeQL and actual bidirectional native/WASM interoperability passed. The full browser suite passed 26/27; Firefox's revised native appearance test timed out at 60 seconds in both attempts. This is not proof of a runtime application defect or a successful Firefox system theme test.

Owner commit `c216b71b8f5d46c831cecda24fb98a04b82f0209` intentionally commented out the general browser/axe job and removed it from deployment dependencies. [Run 45726944498](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45726944498) passed dependency audit, Gitleaks and CodeQL; quality failed 58/59 at `tests/unit/tooling-config.test.js:35` because the assertion required the former exact seven-job dependency list. Interoperability was skipped by the quality dependency. The actual staging tree was reconstructed from the prior full archive and verified against Git tree `ae41305ba57b4d363d81aa56e6e42dd11cf07531`; the unchanged baseline regression reproduced (6/7 tooling tests).

Correction: update the test to inspect the active deployment dependencies, ignoring commented-out lines and whitespace, and assert all six remaining jobs are active. Preserve the owner-disabled browser job, test sources, npm lockfile, public runtime, security scanners and exact-commit deployment review. Normalise workflow whitespace and add an explicit pause comment. Profiles B+D; T2 release context. This is an owner-directed CI configuration correction, not self-approved release risk acceptance. The separate browser release disposition, named owner, expiry/review date and compensating evidence are pending in [release checklist](RELEASE_CHECKLIST.md). No push, merge, deployment, or approval is performed by the authoring agent.

Local verification of the correction: `npm run check:offline` PASS (59/59 unit tests, no skipped tests, static HTML/layout/style and crypto self-test); `npm run lockfile:check` PASS (90 integrity-pinned packages); `node --check tests/unit/tooling-config.test.js` PASS; parsed workflow YAML and asserted active dependencies, disabled general browser job and retained native/WASM harness PASS. Node 22.16.0 is the local runtime; the corrected revision has not yet executed connected CI. The full browser matrix remains NOT RUN in CI by owner direction. Actual native/WASM execution, full lint and security scanning on this corrected revision remain pending a fresh connected run.
