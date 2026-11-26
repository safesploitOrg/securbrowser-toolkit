import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artifactIsReady, checkApproval, checkEnvironment, checkMainPush } from "../../scripts/check-pages-policy.mjs";

const COMMIT = "a".repeat(40);
const CONTEXT = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main", GITHUB_SHA: COMMIT };
const ENVIRONMENT = {
  id: 123,
  name: "github-pages",
  protection_rules: [{ type: "required_reviewers", reviewers: [{ type: "User", reviewer: { id: 42 } }] }],
  deployment_branch_policy: { custom_branch_policies: true, protected_branches: false },
};
const BRANCHES = { total_count: 1, branch_policies: [{ name: "main", type: "branch" }] };
const POLICY = { id: 123, reviewers: [42] };
const APPROVAL = { state: "approved", user: { id: 42, type: "User", login: "synthetic-owner" }, environments: [{ id: 123, name: "github-pages" }], comment: "Synthetic review record" };
const ARTIFACT = { id: 456, name: "github-pages-100-1", expired: false, digest: `sha256:${"b".repeat(64)}` };

describe("Pages promotion policy", () => {
  it("allows only a current main push, not PRs, dispatches or superseded revisions", () => {
    checkMainPush(CONTEXT, COMMIT);
    for (const context of [{ ...CONTEXT, GITHUB_EVENT_NAME: "pull_request" }, { ...CONTEXT, GITHUB_EVENT_NAME: "workflow_dispatch" }, { ...CONTEXT, GITHUB_REF: "refs/heads/staging" }, { ...CONTEXT, GITHUB_REF: "refs/tags/main" }]) {
      assert.throws(() => checkMainPush(context, COMMIT), /current main-push/);
    }
    assert.throws(() => checkMainPush(CONTEXT, "b".repeat(40)), /current main-push/);
  });

  it("requires an existing environment, a direct human reviewer and a main-only policy", () => {
    assert.deepEqual(checkEnvironment(ENVIRONMENT, BRANCHES), POLICY);
    for (const environment of [null, { ...ENVIRONMENT, protection_rules: [] }, { ...ENVIRONMENT, can_admins_bypass: true }, { ...ENVIRONMENT, deployment_branch_policy: null }, { ...ENVIRONMENT, protection_rules: [{ type: "required_reviewers", reviewers: [{ type: "Team", reviewer: { id: 42 } }] }] }]) {
      assert.throws(() => checkEnvironment(environment, BRANCHES));
    }
    for (const branches of [{ total_count: 2, branch_policies: [{ name: "main" }, { name: "staging" }] }, { total_count: 1, branch_policies: [{ name: "*" }] }, { total_count: 1, branch_policies: [{ name: "main", type: "tag" }] }]) {
      assert.throws(() => checkEnvironment(ENVIRONMENT, branches), /single selected main branch/);
    }
  });

  it("requires a recorded human approval for the correct environment and configured reviewer", () => {
    assert.equal(checkApproval([APPROVAL], POLICY), "synthetic-owner");
    for (const reviews of [[], [{ ...APPROVAL, state: "rejected" }], [{ ...APPROVAL, comment: " " }], [{ ...APPROVAL, user: { ...APPROVAL.user, type: "Bot" } }], [{ ...APPROVAL, user: { ...APPROVAL.user, id: 99 } }], [{ ...APPROVAL, environments: [{ id: 999, name: "github-pages" }] }]]) {
      assert.throws(() => checkApproval(reviews, POLICY), /Missing recorded/);
    }
  });

  it("waits for an absent artifact but rejects ambiguous, stale or mismatched metadata", () => {
    const ready = (artifacts, total_count = artifacts.length) => artifactIsReady({ artifacts, total_count }, ARTIFACT.name, "456");
    assert.equal(ready([]), false);
    assert.equal(ready([ARTIFACT]), true);
    for (const artifact of [{ ...ARTIFACT, id: 999 }, { ...ARTIFACT, name: "another-artifact" }, { ...ARTIFACT, expired: true }, { ...ARTIFACT, digest: "" }]) {
      assert.throws(() => ready([artifact]), /does not match/);
    }
    assert.throws(() => ready([ARTIFACT, ARTIFACT]), /Ambiguous/);
    assert.throws(() => ready([ARTIFACT], 2), /Ambiguous/);
  });
});
