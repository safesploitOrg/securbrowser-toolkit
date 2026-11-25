# Release checklist

Profiles B+D, T2. This checklist records evidence, not approval by the authoring agent. No item is waived. Complete on the exact candidate revision before requesting production deployment.

## Bootstrap

- [ ] Use the exact Node version in `.node-version`.
- [ ] Generate the npm lockfile using `bash scripts/prepare-lockfile.sh` or the manual **Prepare npm lockfile** workflow if no lock exists.
- [ ] Review the lockfile and verify artifact `SOURCE_COMMIT`, `SHA256SUMS` and `TOOLCHAIN` against the candidate. Commit the lockfile; run `npm run lockfile:check` and `npm ci`.
- [ ] Review vendored 7-Zip version, upstream parser advisories and pinned release digest; record affected versions, reachability, remediation and any owner-approved risk disposition.

## Mandatory CI gates

- [ ] Quality (HTML-Validate, ESLint, offline/unit checks, Bash syntax, verified WASM build).
- [ ] Dependency audit, secret scan and CodeQL results reviewed under `SECURITY.md`.
- [ ] Browser tests on Chromium, Firefox and WebKit, including axe and real archive round trips.
- [ ] Native 7-Zip interoperability, including both directions, negative controls and byte comparisons. Native-only diagnostics are insufficient.
- [ ] Manual keyboard/focus, 200% zoom and screen reader review; record results and outstanding accessibility issues.
- [ ] Verify public artifact, deployment boundary, rollback and post-deployment smoke plan.

## Human release decision

- Candidate full commit SHA:
- CI run URL:
- Human project owner:
- Review date/time:
- Threat review and verification evidence:
- Remaining findings, mitigation, owner and due date (or none):
- Decision (approve / reject):
- Approval record reference:

Do not fill this record with invented evidence. Configure protected branch rules and the `github-pages` environment in GitHub. After the human owner approves the exact tested commit, manually dispatch CI from `main` with `deploy=true`, `approval_reference` pointing to the human review and `approval_commit` equal to that full SHA. The required gates rerun; the environment approval remains separate. Confirm post-deploy smoke results and retain the validated artifact for rollback.
