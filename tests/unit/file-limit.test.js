import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_SECURE_FILE_BYTES, MAX_PLAINTEXT_BYTES, readFileBytes } from "../../public/assets/js/file-utils.js";

test("oversized file is rejected before allocating bytes; envelope fits the limit", async () => {
  const file = new File([], "large.bin");
  Object.defineProperty(file, "size", { value: MAX_SECURE_FILE_BYTES + 1 });
  file.arrayBuffer = () => { throw new Error("must not read oversized file"); };
  await assert.rejects(readFileBytes(file), /512 MiB/);
  assert.equal(MAX_PLAINTEXT_BYTES + 60, MAX_SECURE_FILE_BYTES);
});
