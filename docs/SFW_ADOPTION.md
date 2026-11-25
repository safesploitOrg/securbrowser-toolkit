# SFW adoption candidate

- Baseline: `main` commit `a24ae4e24d5a3f193b33e3b0d76533ee211031a3` (v2.1.1).
- Profiles: B (browser security tool) + D (deployment automation). Highest change risk: T2.
- Engineering baseline: SFW v1.1.0, included in `docs/engineering/`. The v1.2.0 draft's Section 19 frontend requirements are applied as candidate guidance; formal adoption is pending owner confirmation. No exception or release approval is implied.
- Scope: source candidate only; no remote repository changes, tag or release.

## Frontend traceability

| Requirements | Candidate implementation / evidence |
| --- | --- |
| UI-001–003, UI-006–008 | Retained direct tool, concise title, reduced shadows and decorative elements, accurate distinction between formats and status feedback. |
| UI-004–005 | Semantic tabs, labels, focus, on-accent foreground, responsive CSS, reduced motion; three browsers and three viewport axe checks configured, not yet run. |
| UI-009–010 | System/light/dark; versioned appearance-only storage with safe fallback and System reset; Node tests. |
| UI-011 | Dynamic year, centred footer with verified project link, local favicon; no header repo link. |
| UI-012–013 | Stable password toggles, minimum primary action width, immutable operation snapshots, one active operation and reset cancellation. |
| UI-014–015 | Reference cryptography and native/WASM integration; browser UI/axe suite configured, runtime verification outstanding. |
| UI-016 | `/public` build boundary, one hashed artifact and gating of all release paths. |

## Legacy baseline and outstanding gates

The baseline GitHub CI run 34322412332 had 38/38 unit tests passing, one HTML error at line 421 and two unused catch variables in the archive worker; browser tests skipped. Candidate fixes those source errors; full validators and browser tests need execution on the candidate. A package lock must be generated and committed using the declared Node/npm toolchain (use `scripts/prepare-lockfile.sh` or the read-only Prepare npm lockfile workflow); the local registry is inaccessible. CI uses `npm ci` and deliberately fails without it. No invented lock or waiver is supplied.

Owner must configure branch rulesets, required checks and the github-pages environment, review dependency and SAST findings, record T2 release decision, and complete all mandatory checks before enabling publication. Current release candidate is not release-ready.

RC.2 adds reproducible lockfile preparation, stronger native negative controls, evidence artifacts and exact-commit release review validation. These changes do not substitute for actual connected-runner verification or human approval.
