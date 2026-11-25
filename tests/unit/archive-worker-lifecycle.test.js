import assert from "node:assert/strict";
import { test } from "node:test";
import { createEncryptedArchive } from "../../public/assets/js/archive.js";

const PASSPHRASE = "Synthetic archive fixture only";
const ENTRIES = [{ file: new File(["test"], "test.txt"), path: "test.txt" }];

test("cancelling a pending archive terminates the worker and rejects output", async () => {
  const original = globalThis.Worker;
  let worker;
  class MockWorker {
    constructor() { worker = this; this.listeners = new Map(); this.terminated = false; }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    postMessage(payload) { this.payload = payload; }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = MockWorker;
  try {
    const controller = new AbortController();
    const task = createEncryptedArchive({ entries: ENTRIES, passphrase: PASSPHRASE, signal: controller.signal });
    assert.equal(worker.payload.operation, "create");
    controller.abort();
    await assert.rejects(task, { code: "ARCHIVE_CANCELLED" });
    assert.equal(worker.terminated, true);
  } finally {
    if (original === undefined) delete globalThis.Worker;
    else globalThis.Worker = original;
  }
});
