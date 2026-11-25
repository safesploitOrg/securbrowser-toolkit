import assert from "node:assert/strict";
import { test } from "node:test";
import "../../public/assets/js/archive-policy.js";

const { parseTechnicalListing, safePath } = globalThis.SbtArchivePolicy;
const LIMITS = { maxEntries: 3, maxBytes: 8 };
const listing = (...lines) => ["7-Zip", "----------", ...lines];

test("accepts normal directory, empty file and binary metadata", () => {
  const result = parseTechnicalListing(listing("Path = fixture", "Size = 0", "Attributes = D", "", "Path = fixture/empty", "Size = 0", "", "Path = fixture/data", "Size = 8", "Encrypted = +"), LIMITS);
  assert.equal(result.totalBytes, 8);
  assert.equal(result.entries[0].folder, true);
  assert.equal(result.entries.length, 3);
});

test("rejects missing, repeated, nondecimal and oversized metadata", () => {
  for (const lines of [["Path = a"], ["Path = a", "Size = 1", "Size = 0"], ["Path = a", "Size = 0x1"], ["Path = a", "Size = -1"], ["Path = a", "Size = 9"], ["Path = a", "Size = 9007199254740993"], ["Path = a", "Size = 1", "bad line"]]) {
    assert.throws(() => parseTechnicalListing(listing(...lines), LIMITS));
  }
  assert.throws(() => parseTechnicalListing(["not a listing"], LIMITS));
});

test("rejects paths, duplicate entries, file-directory collisions and links", () => {
  for (const path of ["../x", "/x", "C:x", "a\nSize = 0", "a/".repeat(65) + "x"]) assert.throws(() => safePath(path));
  assert.equal(safePath("./folder/file"), "folder/file");
  for (const lines of [["Path = a", "Size = 0", "Path = a", "Size = 0"], ["Path = a", "Size = 1", "Path = a/b", "Size = 1"], ["Path = a", "Size = 0", "Symbolic Link = elsewhere"], ["Path = a", "Size = 1", "Folder = +"]]) assert.throws(() => parseTechnicalListing(listing(...lines), LIMITS));
});

test("enforces combined expansion and entry limits", () => {
  assert.throws(() => parseTechnicalListing(listing("Path = a", "Size = 5", "Path = b", "Size = 4"), LIMITS), { code: "ARCHIVE_EXPANSION_LIMIT" });
  assert.throws(() => parseTechnicalListing(listing("Path = a", "Size = 0", "Path = b", "Size = 0", "Path = c", "Size = 0", "Path = d", "Size = 0"), LIMITS), { code: "ARCHIVE_ENTRY_LIMIT" });
});
