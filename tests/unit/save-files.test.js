import assert from "node:assert/strict";
import { test } from "node:test";
import { saveToNewDirectory } from "../../public/assets/js/save-files.js";

function mockDirectory() {
  const directories = new Map();
  const files = new Map();
  return {
    directories, files,
    async getDirectoryHandle(name, options) {
      if (!directories.has(name)) {
        if (!options?.create) throw Object.assign(new Error("not found"), { name: "NotFoundError" });
        directories.set(name, mockDirectory());
      }
      return directories.get(name);
    },
    async getFileHandle(name, options) {
      if (!files.has(name) && !options?.create) throw Object.assign(new Error("not found"), { name: "NotFoundError" });
      return { async createWritable() { return { async write(bytes) { files.set(name, bytes); }, async close() {}, async abort() {} }; } };
    },
  };
}

test("saves a nested tree in a new folder and refuses an existing folder", async () => {
  const root = mockDirectory();
  const bytes = Uint8Array.of(1, 2, 3);
  let saved = 0;
  await saveToNewDirectory(root, [{ path: "nested/file.bin", bytes }], "new-folder", () => { saved += 1; });
  assert.equal(saved, 1);
  assert.deepEqual(root.directories.get("new-folder").directories.get("nested").files.get("file.bin"), bytes);
  await assert.rejects(saveToNewDirectory(root, [], "new-folder"), /overwritten/);
});

test("duplicate path does not intentionally overwrite a previously saved file", async () => {
  const root = mockDirectory();
  const first = Uint8Array.of(1);
  let saved = 0;
  await assert.rejects(saveToNewDirectory(root, [{ path: "file.bin", bytes: first }, { path: "file.bin", bytes: Uint8Array.of(2) }], "new", () => { saved += 1; }), /overwritten/);
  assert.equal(saved, 1);
  assert.deepEqual(root.directories.get("new").files.get("file.bin"), first);
});
