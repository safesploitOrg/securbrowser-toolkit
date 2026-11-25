# Operations and release

## Controlled deployment

The CI workflow runs on PRs, main pushes and explicit manual runs. A manual run with `deploy=true` and a non-empty human approval reference and `approval_commit` matching the exact full commit SHA on `main` requests production deployment; the reusable Pages workflow cannot be dispatched independently and has all required CI jobs as dependencies. Configure required branch checks and github-pages environment restrictions/reviewers in GitHub. Record owner review against the exact commit and evidence; an input value alone cannot prove human approval. No auto-publish on push.

Release builds `public/` once, stores a file checksum manifest and verified vendor ZIP outside the public tree, runs browser and native interoperability against that exact candidate, and promotes the same public artifact. Post-deploy checks verify the page and served WASM SHA. Retain the source commit, evidence and artifact or equivalent validated build inputs for rollback; artifact retention in CI is seven days, so archive approved releases separately if longer rollback is required.

## Incident and rollback

If a compromised dependency, leaked credential, broken gate or unintended data disclosure is suspected, stop releases and remove public exposure as appropriate. Review GitHub audit/deployment history, rotate any exposed credentials, assess affected artifacts and notify users where appropriate. Restore a previously reviewed safe revision by running the full CI and recorded owner-approved release flow; never bypass gates to roll back. Add regression tests and update the threat model.

Monitor HTTPS availability, static asset availability and vendor advisories; use synthetic files only for smoke checks. No user-content telemetry or remote error reporting. Database backups and application server logs are N/A for the browser-only application. Review risk and dependencies at least quarterly, urgently after security advisories. Assign named owner and remediation dates before release.

## Release evidence

Retain the CI run URL and unit, dependency-audit, secret-scan status, SAST, browser and interoperability evidence artifacts. Secret-scan artifacts contain only the exit status; scanner console output is redacted. A recorded owner decision and protected environment approval remain separate from automated verification. See [release checklist](RELEASE_CHECKLIST.md).
