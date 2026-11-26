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
    const required = ["quality", "dependency-audit", "secrets", "sast", "interoperability", "release-review"];
    assert.deepEqual(needs[1].split(",").map((name) => name.trim()).sort(), [...required].sort());
    for (const name of required) assert.match(active, new RegExp(`^  ${name}:$`, "m"));
    assert.doesNotMatch(active, /^  browser:/m);
    assert.match(active, /npm ci --ignore-scripts/);
    assert.match(active, /bash scripts\/test-7z-interop\.sh/);
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
