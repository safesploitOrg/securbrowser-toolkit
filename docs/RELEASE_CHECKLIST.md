# Release checklist

Profiles B+D, T2. This checklist records evidence, not approval by the authoring agent. Complete on the exact candidate revision before requesting production deployment. The project owner paused the general browser/axe CI job on 26 November 2026 (staging `c216b71b8f5d46c831cecda24fb98a04b82f0209`). The remaining automated gates are still mandatory. Browser verification is outstanding until independently completed or covered by an explicit, recorded, time-bounded SFW Section 14 release exception.

## Bootstrap

- [ ] Use the exact Node version in `.node-version`.
- [ ] Generate the npm lockfile using `bash scripts/prepare-lockfile.sh` or the **Prepare npm lockfile** workflow (staging push or manual dispatch if available) if no lock exists.
- [ ] Review the lockfile and verify artifact `SOURCE_COMMIT`, `SHA256SUMS` and `TOOLCHAIN` against the candidate. Commit the lockfile; run `npm run lockfile:check` and `npm ci`.
- [ ] Review vendored 7-Zip version, upstream parser advisories and pinned release digest; record affected versions, reachability, remediation and any owner-approved risk disposition.

## Mandatory CI gates

- [ ] Quality (HTML-Validate, ESLint, offline/unit checks, Bash syntax, verified WASM build).
- [ ] Dependency audit, secret scan and CodeQL results reviewed under `SECURITY.md`.
- [ ] Browser tests on Chromium, Firefox and WebKit, including axe and real archive round trips (general CI job paused; separate exact-revision evidence or valid Section 14 exception required before release).
- [ ] Native 7-Zip interoperability, including both directions, negative controls and byte comparisons. Native-only diagnostics are insufficient.
- [ ] Manual keyboard/focus, 200% zoom and screen reader review; record results and outstanding accessibility issues.
- [ ] Verify public artifact, deployment boundary, rollback and post-deployment smoke plan.

## Browser CI pause — pending release disposition

| Field | Record |
| --- | --- |
| Affected control | SFW v1.1.0 Section 6, general Chromium/Firefox/WebKit E2E and axe automation; UI-015 candidate guidance |
| Owner decision | Project owner explicitly disabled the general job on 2026-11-26, commit `c216b71` |
| Reason | Firefox system appearance test remains failing in the automation environment; latest full matrix 26/27, including retries |
| Scope | General browser/axe CI only; test files, local commands, all other CI gates and native/WASM interop are retained |
| Risk | Cross-browser, accessibility, privacy and UI regressions may escape automated PR/release detection; no application failure is established by the Firefox timeout alone |
| Compensating evidence | Previous matrix 26/27 and passing native/WASM exchange; fresh native/WASM Chromium, unit and security checks still required. Historical results do not establish current-revision browser compliance. |
| Tracking | PR #10; CI runs 45725245514 and 45726216033 |
| Named owner, severity, review/expiry and release risk acceptance | Pending explicit owner record; not supplied by the agent |
| Restoration criterion | Resolve the Firefox automation issue, run the full required matrix successfully and restore the browser job and deployment dependency together with its regression assertion |
| Release disposition | Pending: do not represent this pause as an approved release exception or a passed browser gate |

## Human release decision

- Candidate full commit SHA:
- CI run URL:
- Human project owner:
- Review date/time:
- Threat review and verification evidence:
- Remaining findings, mitigation, owner and due date (or none):
- Decision (approve / reject):
- Approval record reference:

Do not fill this record with invented evidence. Configure protected branch rules and the `github-pages` environment in GitHub. After the human owner approves the exact tested commit, manually dispatch CI from `main` with `deploy=true`, `approval_reference` pointing to the human review and `approval_commit` equal to that full SHA. The enabled automated gates rerun; obtain the separate browser verification or an approved Section 14 exception before requesting deployment. The environment approval remains separate. Confirm post-deploy smoke results and retain the validated artifact for rollback.
