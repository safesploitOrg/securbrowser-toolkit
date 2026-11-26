import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("Bash interoperability fixtures use genuine UTF-8 filenames and exact binary bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "sbt-interop-fixtures-"));
  try {
    const result = spawnSync("bash", ["-c", 'source "$1"; WORK_DIR="$2"; write_fixtures', "fixture-test", "scripts/test-7z-interop.sh", dir], { encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readdirSync(join(dir, "fixture")).sort(), ["@literal.txt", "empty.bin", "nested", "notes.txt"]);
    assert.deepEqual(readdirSync(join(dir, "fixture/nested")).sort(), ["binary.dat", "caf\u00e9.txt"]);
    assert.deepEqual(readFileSync(join(dir, "fixture/nested/binary.dat")), Buffer.from([0, 1, 2, 255, 254]));
    assert.equal(readFileSync(join(dir, "fixture/nested/caf\u00e9.txt"), "utf8"), "unicode fixture\n");
    assert.equal(readFileSync(join(dir, "fixture/empty.bin")).length, 0);
    assert.equal(readFileSync(join(dir, "fixture/@literal.txt"), "utf8"), "literal filename\n");
    assert.equal(readFileSync(join(dir, "fixture/notes.txt"), "utf8"), "synthetic archive fixture\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
