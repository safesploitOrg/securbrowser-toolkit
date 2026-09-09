import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const PACKAGE = JSON.parse(readFileSync("package.json", "utf8"));
const HTML_VALIDATE = JSON.parse(readFileSync(".htmlvalidate.json", "utf8"));
const CI_WORKFLOW = readFileSync(".github/workflows/ci.yml", "utf8");
const DEPLOY_WORKFLOW = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

const NODE_VERSION = "26.8.1";

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

  it("pins CI and Pages to the requested Node.js Current release", () => {
    for (const workflow of [CI_WORKFLOW, DEPLOY_WORKFLOW]) {
      assert.match(workflow, new RegExp(`NODE_VERSION: "${NODE_VERSION.replaceAll(".", "\\.")}"`));
      assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
      assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
    }
  });

  it("keeps HTML and unit diagnostics independent from earlier quality failures", () => {
    assert.match(CI_WORKFLOW, /Run dependency-free HTML checks[\s\S]*if: \$\{\{ always\(\) \}\}/);
    assert.match(CI_WORKFLOW, /Run unit tests[\s\S]*if: \$\{\{ always\(\) \}\}/);
  });
});
