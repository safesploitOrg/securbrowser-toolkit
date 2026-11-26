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


## Same-run CD remediation — 26 November 2026

Baseline: main `5d949b96ca53931ff58edb68eebf032e1dbe4d57`, Git tree `c63e8d4b7d4c7ad54a2247b7b9deda8855f9ad43`; the full source archive was checked against that exact Git tree. Main push [45728226823](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45728226823) passed all enabled gates. The manually dispatched [45729394024](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45729394024) on the same commit passed release-reference validation, quality, Gitleaks, CodeQL, npm audit and native/WASM interoperability. CD job [139609043375](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45729394024/job/139609043375) downloaded and verified `validated-public`, configured Pages and successfully uploaded `github-pages` artifact 15075238815. The immediately subsequent `deploy-pages` action listed six artifacts and could not find the just-uploaded seventh; smoke checks were skipped. The GitHub REST artifact list later showed the Pages artifact, confirming an artifact-discovery failure, not proving the exact underlying cause. Both downloaded baseline artifacts were checked against GitHub's recorded SHA-256 digests. Inspection also confirmed the old upload action omitted `.nojekyll`.

Change scope: profiles B+D, T2 (production deployment control). Preserve the app, browser test pause, canonical SFW v1.1.0, genuine npm lockfile and dependency versions. Replace the manual CI inputs/release-reference job with a main-push-only reusable CD stage. Require all five enabled CI jobs, download the immutable quality artifact ID, verify the source SHA and complete file inventory, prepare a uniquely named Pages artifact before approval, and compare its tar files against the candidate manifest. Pin `upload-pages-artifact` v5.0.0 (`fc324d3547104276b827a68afc52ff2a11cc49c9`), which uses upload-artifact v7 and supports hidden files. Keep `deploy-pages` v5.0.1 (`368f82528645a54fb793d4d04e342629a3f51346`). The protected job rechecks the current main SHA, environment/reviewer policy and recorded human approval, polls for the exact Pages artifact's visibility, downloads it by ID and verifies its tar hash before deployment. No extra CI build/scan run. The owner must configure `github-pages` with one or more individual reviewers (including the owner), one selected branch rule `main`, and disabled administrator bypass. The guard reads GitHub API metadata; it cannot establish the substantive adequacy of review comments or all UI-only protection settings. Approval history is per workflow run; GitHub's native job protection must remain enabled for retries. Reject/cancel stale runs; the main-head check reduces, but cannot eliminate, races with later pushes. No production publication or human approval performed here.

Threat review: a missing/unprotected environment could otherwise permit accidental deployment; require an existing main-only environment with configured User reviewer before packaging, and verify actual recorded reviewer approval again in the protected job. Fork PR/manual validation events cannot request promotion. Exact immutable artifact IDs, run/attempt-specific names and full manifest/tar checks guard substitution, ambiguous names and extra files. Scoped read-only preparation; Pages write/OIDC limited to the protected deployment job. GitHub administrators or repository owners can change workflows/protection; repository rules and owner oversight remain necessary. A service-side visibility failure may still occur; bounded polling and separate jobs address the observed failure mode without claiming it is conclusively fixed. Do not blindly retry publication; inspect deployment state and rerun failed jobs only when the candidate remains current and retained. Roll back via a reviewed revert and the same gated CI/CD process.

| Verification for the revised CD candidate | Result |
| --- | --- |
| Actual main source baseline | PASS: all 88 tracked files/modes match the remote Git tree before changes. |
| `npm run lockfile:check` | PASS: original 90 integrity-pinned packages. |
| `npm run check:offline` | PASS: 64/64 tests (five additional deployment-policy/configuration tests), static HTML, layout, style and crypto self-test on local Node 22.16.0. |
| YAML structure, dependency/permission graph, `bash -n` workflow run blocks and harnesses, changed JS syntax | PASS: local static checks. Not a GitHub workflow execution or actionlint result. |
| Real baseline GitHub artifacts | PASS: both downloaded ZIP SHA-256 digests match the API; all 23 validated public file hashes match. |
| Pages v5 tar packaging logic | PASS: reproduced the pinned Linux tar command against the genuine validated public artifact, retaining `.nojekyll` and matching the entire public file manifest after extraction. This is not execution of the new GitHub action. |
| App, dependencies and SFW policy | PASS: byte-for-byte unchanged against baseline. |
| Full lint, connected CI/scans, new native/browser tests, protected environment approval, artifact visibility and actual publication on revised revision | NOT RUN: requires connected GitHub runner and configured human review. Previous run's passes are historical evidence only. |
| Full browser/axe verification and owner exception | PENDING: general job remains owner-paused; no release exception or sign-off manufactured. |

Authoring runtime is Node 22.16.0 rather than pinned 26.8.1; full connected CI is still required. Environment settings could not be read through the available repository connector. Review the [GitHub environment configuration guidance](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [workflow review history API](https://docs.github.com/en/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run). Confirm a real successful main run reaches the native approval gate before relying on this release path. Source candidate only; no remote mutation or deployment.

## Single-file archive remediation — 26 November 2026

Baseline: exact main `30f9dcdd2db547620e6f7c992a2384b956d11273`, Git tree `c4db46608d7b9f2ed0268ae78198486424e9c4c9` (90 tracked files), PR #11. [Run 45732899718](https://github.com/safesploitOrg/securbrowser-toolkit/actions/runs/45732899718), attempt 3: all enabled CI gates, Pages preparation, recorded human approval, deployment and hosted WASM SHA-256 smoke verification passed. This is historical evidence, not approval of the new candidate. The reported single extensionless 154-byte file subsequently failed at archive creation. Classification B+D, T2 (archive verification and parser boundary). No external archive-parser expansion, changed cryptographic parameters, extra archive entries, new dependencies or engine replacement.

Actual local reproduction used the original pinned release ZIP from GitHub run 45729394024, independently checked against committed SHA-256 `8c4dc98f02d35b6163416ba6a7f330ef321df78f8eebb81943c2af32e04bfdd6`. At levels 0, 3, 5 and 9, the single-file encrypted archive's wrong-password listing threw the exact `Aborted(undefined). Build with -sASSERTIONS for more info.` WebAssembly exception. Two-file protected archives returned exit code 2; single/two-file visible-header negative controls listed successfully. The upstream build disables C++ exception catching. The narrow compatibility correction requires correct-password integrity, exact entry checks, no entry section in the failed probe and independent generated AES-only outer-header structure verification before accepting this particular abort. Unrelated errors, invalid exit statuses, malformed headers and filename exposure remain blocking. See `SECURE_ARCHIVE.md` and `threat-model.md` for scope and limitations.

| Check on revised source | Actual result |
| --- | --- |
| Original source baseline | PASS: original ZIP Git tree and all 90 tracked paths/modes match exact main tree. |
| Lockfile | PASS: 90 integrity-pinned packages; no dependency/version changes. |
| `npm run build:public` | PASS: genuine cached vendor ZIP and JS/WASM/licence digests verified; no replacement binary. |
| `npm run check:offline` | PASS: 68/68 unit tests, including generated header and CI gate regressions; layout, static HTML, style and crypto self-test. |
| `npm run test:wasm` | PASS: 10/10 tests with the production worker and real pinned WASM in Node, including four compression levels, exact bytes, empty/Unicode and multiple files, incorrect passwords, visible headers, unexpected runtime failures and simulated abort negatives. |
| Local HTTP server | PASS: HTTP 200, application/wasm and CSP. |
| Browser reproduction | BLOCKED: installed Chromium navigation to loopback was denied with `ERR_BLOCKED_BY_ADMINISTRATOR`. No bypass attempted. |
| Expanded native/Chromium interoperability | NOT RUN: native `7zz`/`7z` and installed pinned Playwright tooling unavailable. Fixture and shell syntax checks passed. |
| Pinned Node, full lint/HTML-Validate and security scans | NOT RUN: authoring environment uses Node 22.16.0, not the pinned 26.8.1, and lacks installed dev/scanner tooling. Required CI remains enabled. |
| Deployment | NOT RUN for this candidate. Prior protected approval/deployment workflow is unchanged apart from the new quality test step. |

The runtime regression is now mandatory before CI candidate packaging. Real-browser/native interoperability remains mandatory and the prior general browser/axe pause is unchanged; complete current-revision verification or an applicable documented owner-approved Section 14 exception before public release. Local instructions are in `testing.md` and the README. Roll back by reverting the scoped source change through the existing protected CI/CD process. No remote mutation or agent-approved release/exception. The upstream engine still has disabled C++ exception catching; the correction is a bounded compatibility path, not a rebuilt engine or universal 7z parser fix.
