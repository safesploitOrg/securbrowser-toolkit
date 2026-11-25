import assert from "node:assert/strict";
import { test } from "node:test";
import { validateLockfile } from "../../scripts/check-lockfile.mjs";

// Synthetic metadata exercises the validator, not npm resolution or package authenticity.
const manifest = { name: "synthetic", version: "1.0.0", devDependencies: { sample: "1.2.3" } };
const fixture = () => ({
  name: manifest.name, version: manifest.version, lockfileVersion: 3,
  packages: {
    "": { ...manifest },
    "node_modules/sample": { version: "1.2.3", resolved: "https://registry.npmjs.org/sample/-/sample-1.2.3.tgz", integrity: `sha512-${"A".repeat(86)}==` },
  },
});

test("lockfile gate accepts consistent registry metadata", () => {
  assert.equal(validateLockfile(manifest, fixture()), 1);
});

test("lockfile gate rejects stale manifests, missing direct pins and unsupported versions", () => {
  for (const mutate of [
    (lock) => { lock.lockfileVersion = 2; },
    (lock) => { lock.version = "0.0.1"; },
    (lock) => { lock.packages[""].devDependencies = {}; },
    (lock) => { delete lock.packages["node_modules/sample"]; },
    (lock) => { lock.packages["node_modules/sample"].version = "2.0.0"; },
  ]) {
    const lock = fixture();
    mutate(lock);
    assert.throws(() => validateLockfile(manifest, lock));
  }
});

test("lockfile gate rejects unapproved package origins, links and missing integrity", () => {
  for (const fields of [
    { resolved: "https://other.example/sample.tgz" },
    { resolved: "http://registry.npmjs.org/sample.tgz" },
    { resolved: "file:../sample" },
    { link: true },
    { integrity: undefined },
  ]) {
    const lock = fixture();
    Object.assign(lock.packages["node_modules/sample"], fields);
    assert.throws(() => validateLockfile(manifest, lock));
  }
});
