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

  it("gates deploy on all active quality, security and interoperability jobs", () => {
    // Match the active flow-style dependency list, not commented-out YAML.
    // The owner paused the general browser/axe job; do not weaken other gates.
    const active = CI_WORKFLOW.replace(/^[ \t]*#.*$/gm, "");
    const sections = active.split(/^  deploy:[ \t]*$/m);
    assert.equal(sections.length, 2, "expected one active deployment job");
    const needs = sections[1].match(/^    needs: \[([^\]]+)\]/m);
    assert.ok(needs, "deployment must declare its required jobs");
    const required = ["quality", "dependency-audit", "secrets", "sast", "interoperability"];
    assert.deepEqual(needs[1].split(",").map((name) => name.trim()).sort(), [...required].sort());
    for (const name of required) assert.match(active, new RegExp(`^  ${name}:$`, "m"));
    assert.doesNotMatch(active, /^  browser:/m);
    assert.match(active, /npm ci --ignore-scripts/);
    assert.match(active, /bash scripts\/test-7z-interop\.sh/);
    assert.match(DEPLOY_WORKFLOW, /workflow_call:/);
    assert.doesNotMatch(DEPLOY_WORKFLOW, /^\s{2}workflow_dispatch:/m);
    assert.doesNotMatch(DEPLOY_WORKFLOW, /npm run build:public/);
  });

  it("keeps bootstrap read-only and deployment tied to the validated artifact", () => {
    assert.match(BOOTSTRAP_WORKFLOW, /contents: read/);
    assert.doesNotMatch(BOOTSTRAP_WORKFLOW, /contents: write|pages: write|git push|deploy-pages/);
    assert.match(BOOTSTRAP_WORKFLOW, /scripts\/prepare-lockfile\.sh/);
    assert.match(CI_WORKFLOW, /candidate_artifact_id: \$\{\{ steps\.candidate\.outputs\.artifact-id \}\}/);
    assert.match(CI_WORKFLOW, /candidate_artifact_id: \$\{\{ needs\.quality\.outputs\.candidate_artifact_id \}\}/);
    assert.match(DEPLOY_WORKFLOW, /artifact-ids: \$\{\{ inputs\.candidate_artifact_id \}\}/);
    assert.match(DEPLOY_WORKFLOW, /test "\$\(cat release-bundle\/SOURCE_COMMIT\)" = "\$GITHUB_SHA"/);
    assert.doesNotMatch(CI_WORKFLOW + DEPLOY_WORKFLOW, /inputs\.approval_commit|inputs\.approval_reference|inputs\.deploy/);
    assert.match(CI_WORKFLOW, /npm run lockfile:check/);
  });

  it("packages before the protected CD job and cannot publish from PR or manual CI runs", () => {
    const gate = /if: \$\{\{ github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' \}\}/;
    assert.match(CI_WORKFLOW.split(/^  deploy:$/m)[1], gate);
    const [prepare, deploy] = DEPLOY_WORKFLOW.split(/^  deploy:$/m);
    assert.ok(deploy, "expected separate deployment job");
    assert.match(prepare, gate);
    assert.match(deploy, gate);
    assert.doesNotMatch(prepare, /pages: write|id-token: write|actions\/deploy-pages@/);
    assert.match(prepare, /actions\/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9/);
    assert.match(prepare, /include-hidden-files: true/);
    assert.match(prepare, /node scripts\/check-pages-policy\.mjs prepare/);
    assert.match(prepare, /cmp release-bundle\/SHA256SUMS/);
    assert.match(deploy, /needs: prepare/);
    assert.match(deploy, /environment:\n      name: github-pages/);
    assert.match(deploy, /node scripts\/check-pages-policy\.mjs deploy/);
    assert.match(deploy, /EXPECTED_TAR_SHA256: \$\{\{ needs\.prepare\.outputs\.tar_sha256 \}\}/);
    assert.match(deploy, /artifact_name: \$\{\{ needs\.prepare\.outputs\.pages_artifact_name \}\}/);
    assert.doesNotMatch(deploy, /actions\/upload-pages-artifact@|npm ci|npm run build:public/);
    assert.ok(deploy.indexOf("node scripts/check-pages-policy.mjs deploy") < deploy.indexOf("actions/deploy-pages@"));
  });

  it("bootstraps the lockfile on staging pushes without weakening normal CI", () => {
    assert.match(BOOTSTRAP_WORKFLOW, /push:\n    branches: \[staging\]/);
    assert.match(BOOTSTRAP_WORKFLOW, /paths:\n      - '\.github\/workflows\/prepare-lockfile\.yml'/);
    assert.doesNotMatch(BOOTSTRAP_WORKFLOW, /^  pull_request(?:_target)?:/m);
    assert.match(BOOTSTRAP_WORKFLOW, /if \[\[ -e package-lock\.json \|\| -L package-lock\.json \]\]; then\n            npm run lockfile:check/);
    assert.match(BOOTSTRAP_WORKFLOW, /else\n            bash scripts\/prepare-lockfile\.sh/);
    assert.equal([...BOOTSTRAP_WORKFLOW.matchAll(/if: steps\.bootstrap\.outputs\.generated == 'true'/g)].length, 2);
    assert.match(CI_WORKFLOW, /name: Validate committed lockfile\n        run: npm run lockfile:check/);
    assert.doesNotMatch(CI_WORKFLOW, /scripts\/prepare-lockfile\.sh|npm install --package-lock-only/);
  });

  it("keeps HTML and unit diagnostics independent from earlier quality failures", () => {
    assert.match(CI_WORKFLOW, /Run dependency-free HTML checks[\s\S]*if: \$\{\{ always\(\) \}\}/);
    assert.match(CI_WORKFLOW, /Run unit tests[\s\S]*if: \$\{\{ always\(\) \}\}/);
  });
});

it("real WASM regressions gate candidate packaging", () => {
  assert.equal(PACKAGE.scripts["test:wasm"], "node --test tests/runtime/*.test.mjs");
  const quality = CI_WORKFLOW.split("\n  dependency-audit:")[0];
  const build = quality.indexOf("name: Build pinned WASM runtime once");
  const regression = quality.indexOf("name: Run real WASM archive regressions");
  const packaging = quality.indexOf("name: Package candidate and integrity manifest");
  assert.ok(build >= 0 && regression > build && packaging > regression);
  const step = quality.slice(regression, quality.indexOf("name: Retain WASM runtime evidence"));
  assert.match(step, /set -euo pipefail/);
  assert.match(step, /npm run test:wasm/);
  assert.doesNotMatch(step, /continue-on-error|if:|\|\| true/);
});
