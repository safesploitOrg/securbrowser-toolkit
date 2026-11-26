# Operations and release

## Controlled deployment

CI runs on PRs, `main` pushes and explicit manual validation runs. Only a successful `main` push can invoke the reusable Pages workflow. All five currently enabled quality, security and native/WASM interoperability jobs must succeed. The reusable workflow has a read-only preparation job followed by a protected production deployment job; no second CI run is necessary. The general browser/axe job is temporarily paused by the project owner; this is not a passed browser gate or release exception.

### One-time GitHub configuration

Before merging the CD change, open repository **Settings → Pages** and select **GitHub Actions** as the publishing source. Under **Settings → Environments → github-pages**, configure:

| Setting | Required configuration |
| --- | --- |
| Required reviewers | Add the project owner as an individual User reviewer. Team-only rules are not accepted by this repository's supplemental guard. |
| Prevent self-review | Leave off for solo maintenance; enable if a separate authorised reviewer is available. |
| Deployment branches and tags | Selected branches and tags; exactly one Branch rule, `main`. Remove wildcard/tag rules. |
| Administrator bypass | Disable allowing administrators to bypass protection rules. |
| PR and branch protection | Keep the required CI checks and human pre-merge review for selected T2 changes. |

The preparation job reads the environment and branch policy via GitHub's REST API and fails closed if the required reviewer or main-only restriction is missing. The deploy job rechecks protection, recorded review and current main revision after environment approval. GitHub's native gate is the enforcement boundary; the supplemental API checks cannot prove the adequacy of the review or that all platform settings were correctly configured (administrator bypass is not consistently exposed by the environment API). The owner must verify the settings in the UI. No personal access token or additional repository secret is required.

### Normal release

1. Review the PR and security-sensitive changes; record the required pre-merge T2 review, then merge to `main`.
2. Main CI builds `public/` once, writes `SOURCE_COMMIT` and `SHA256SUMS`, and uploads an immutable artifact with a run/attempt-specific name. Interoperability downloads that exact artifact ID. All enabled quality and security jobs must pass.
3. The read-only Pages preparation job verifies the source SHA, entire file inventory and hashes, packages the same bytes with pinned `upload-pages-artifact` v5.0.0 (including hidden files), and compares the actual tar contents against the validated manifest. It records the Pages artifact ID, name and tar/WASM hashes. The CD job then waits for `github-pages` review.
4. Open **Actions → CI → Review deployments**, select `github-pages`, review the exact revision and CI evidence, and record an explicit owner release decision. Before approving, complete the [release checklist](RELEASE_CHECKLIST.md), including browser evidence or a valid SFW Section 14 exception. Include the review/exception reference in a non-empty approval comment; GitHub records the run and reviewer automatically. Reject if the evidence is incomplete. No deploy flag or manual commit-SHA input is needed.
5. After approval the protected job checks GitHub's review history for an approval by a configured individual reviewer on this environment and run, checks that `main` has not moved, waits for the exact Pages artifact to become visible, downloads it by ID, verifies its tar hash and deploys that prepared artifact by its unique name. Only this job receives Pages write and OIDC permissions. It does not rebuild or install application dependencies. The post-deployment smoke checks verify the page and served WASM SHA.

### Failed or stale deployment

If artifact discovery fails, inspect the artifact ID and run logs. The separate preparation job, updated upload action and bounded visibility check reduce the observed upload/discovery race; GitHub's internal artifact listing can still fail. For a transient CD-only failure, use **Re-run failed jobs** on that same run, after checking the exact artifact is still retained and `main` still points to that revision. Reapprove the environment if prompted. Do not create a second build in the deployment stage or blindly retry an action that might already have published. If the deployment already occurred but its smoke check failed, investigate the actual served site before attempting another deployment.

The candidate and Pages artifacts are retained for seven days. Approve within that window, otherwise cancel the stale run. If `main` advances, reject/cancel the old deployment and review the newer main run; the workflow also rejects a superseded revision. A new run is required for expired artifacts or a changed source revision. Retain the source commit, evidence and artifact or equivalent validated build inputs for rollback; archive approved releases separately if longer rollback is needed.

## Incident and rollback

If a compromised dependency, leaked credential, broken gate or unintended data disclosure is suspected, stop releases and remove public exposure as appropriate. Review GitHub audit/deployment history, rotate any exposed credentials, assess affected artifacts and notify users where appropriate. Restore a previously reviewed safe revision by running the full CI and recorded owner-approved release flow; never bypass gates to roll back. Add regression tests and update the threat model.

Monitor HTTPS availability, static asset availability and vendor advisories; use synthetic files only for smoke checks. No user-content telemetry or remote error reporting. Database backups and application server logs are N/A for the browser-only application. Review risk and dependencies at least quarterly, urgently after security advisories. Assign named owner and remediation dates before release.

## Release evidence

Retain the CI run URL and unit, dependency-audit, secret-scan status, SAST and interoperability evidence artifacts, plus separate browser evidence or the approved exception while the general browser/axe CI job is paused. Secret-scan artifacts contain only the exit status; scanner console output is redacted. A recorded owner decision and protected environment approval remain separate from automated verification. The approval record is attached to the existing CI run, not a second CI run. See [release checklist](RELEASE_CHECKLIST.md).
