import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const PACKAGE = JSON.parse(readFileSync("package.json", "utf8"));
const HTML_VALIDATE = JSON.parse(readFileSync(".htmlvalidate.json", "utf8"));
const CI_WORKFLOW = readFileSync(".github/workflows/ci.yml", "utf8");
const BOOTSTRAP_WORKFLOW = readFileSync(".github/workflows/prepare-lockfile.yml", "utf8");
const DEPLOY_WORKFLOW = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

const NODE_VERSION = readFileSync(".node-version", "utf8").trim();

describe("tooling configuration", () => {
  it("uses Node's built-in test runner without Vitest", () => {
    assert.equal(PACKAGE.scripts["test:unit"], "node --test tests/unit/*.test.js");
    assert.equal(Object.hasOwn(PACKAGE.devDependencies, "vitest"), false);
  });

  it("combines HTML-Validate recommended and Prettier compatibility presets", () => {
    assert.deepEqual(HTML_VALIDATE.extends, [
      "html-validate:recommended",
      "html-validate:prettier",
    ]);
  });

  it("uses a single pinned Node runtime and full action commit pins", () => {
    assert.match(NODE_VERSION, /^\d+\.\d+\.\d+$/);
    assert.match(CI_WORKFLOW, /node-version-file: \.node-version/);
    for (const workflow of [CI_WORKFLOW, DEPLOY_WORKFLOW, BOOTSTRAP_WORKFLOW]) {
      for (const match of workflow.matchAll(/uses: (?!\.\/)[^\s@]+@([^\s]+)/g)) assert.match(match[1], /^[a-f0-9]{40}$/);
    }
  });

  it("gates deploy on all quality, security and interoperability jobs", () => {
    assert.match(CI_WORKFLOW, /needs: \[quality, dependency-audit, secrets, sast, browser, interoperability, release-review\]/);
    assert.match(CI_WORKFLOW, /npm ci --ignore-scripts/);
    assert.match(CI_WORKFLOW, /scripts\/test-7z-interop\.sh/);
    assert.match(DEPLOY_WORKFLOW, /workflow_call:/);
    assert.doesNotMatch(DEPLOY_WORKFLOW, /^\s{2}workflow_dispatch:/m);
    assert.doesNotMatch(DEPLOY_WORKFLOW, /npm run build:public/);
  });

  it("keeps bootstrap read-only and deployment tied to the reviewed commit", () => {
    assert.match(BOOTSTRAP_WORKFLOW, /contents: read/);
    assert.doesNotMatch(BOOTSTRAP_WORKFLOW, /contents: write|pages: write|git push|deploy-pages/);
    assert.match(BOOTSTRAP_WORKFLOW, /scripts\/prepare-lockfile\.sh/);
    assert.match(CI_WORKFLOW, /inputs\.approval_commit == github\.sha/);
    assert.match(DEPLOY_WORKFLOW, /inputs\.approval_commit == github\.sha/);
    assert.match(CI_WORKFLOW, /npm run lockfile:check/);
  });

  it("keeps HTML and unit diagnostics independent from earlier quality failures", () => {
    assert.match(CI_WORKFLOW, /Run dependency-free HTML checks[\s\S]*if: \$\{\{ always\(\) \}\}/);
    assert.match(CI_WORKFLOW, /Run unit tests[\s\S]*if: \$\{\{ always\(\) \}\}/);
  });
});
