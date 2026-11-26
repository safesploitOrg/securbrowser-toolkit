import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("SARIF gate fails closed on missing, malformed, failed and non-empty reports", () => {
  const dir = mkdtempSync(join(tmpdir(), "sbt-sarif-"));
  const run = () => spawnSync(process.execPath, ["scripts/check-sarif.mjs", dir]).status;
  try {
    assert.notEqual(run(), 0);
    const report = (results, executionSuccessful = true) => ({ runs: [{ tool: { driver: { name: "Synthetic" } }, invocations: [{ executionSuccessful }], results }] });
    writeFileSync(join(dir, "test.sarif"), "invalid");
    assert.notEqual(run(), 0);
    writeFileSync(join(dir, "test.sarif"), JSON.stringify(report([], false)));
    assert.notEqual(run(), 0);
    writeFileSync(join(dir, "test.sarif"), JSON.stringify(report([{ ruleId: "synthetic" }])));
    assert.notEqual(run(), 0);
    writeFileSync(join(dir, "test.sarif"), JSON.stringify(report([])));
    assert.equal(run(), 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
