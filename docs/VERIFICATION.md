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
