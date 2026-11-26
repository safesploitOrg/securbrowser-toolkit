// Executes the real, digest-pinned WASM through the production classic worker.
// Node provides only the Worker message/importScripts boundary, not a browser.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { CACHE_PATH, verifiedRuntimeFiles } from "../../scripts/vendor-release.mjs";

const PASSPHRASE = "Synthetic config fixture passphrase";
const WRONG = "Synthetic incorrect archive passphrase";
const ROOT = new URL("../../", import.meta.url);
const POLICY_URL = new URL("public/assets/js/archive-policy.js", ROOT);
const WORKER_URL = new URL("public/assets/js/archive-worker.js", ROOT);
const FIXTURE = new Uint8Array(154).fill(65);
let factory;
let wasmBinary;
let workerSource;
let policySource;
let temporary;

before(async () => {
  const files = verifiedRuntimeFiles(await readFile(new URL(CACHE_PATH, ROOT)));
  // Test the exact public runtime, not another version of the vendor library.
  for (const [name, bytes] of Object.entries(files)) {
    assert.deepEqual(await readFile(new URL(`public/vendor/sevenzip-wasm/${name}`, ROOT)), bytes);
  }
  temporary = await mkdtemp(join(tmpdir(), "sbt-wasm-test-"));
  const loader = join(temporary, "engine.cjs");
  await writeFile(loader, files["sevenzip-wasm.js"]);
  factory = createRequire(import.meta.url)(loader);
  wasmBinary = files["sevenzip-wasm.wasm"];
  [workerSource, policySource] = await Promise.all([readFile(WORKER_URL, "utf8"), readFile(POLICY_URL, "utf8")]);
});

after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

async function runWorker(operation, payload, transformModule) {
  let receive;
  const messages = [];
  let commands = 0;
  const self = {
    location: { href: "https://sbt.test/assets/js/archive-worker.js" },
    crypto: webcrypto,
    importScripts(url) {
      if (url.endsWith("/assets/js/archive-policy.js")) runInContext(policySource, context, { filename: "archive-policy.js" });
      else if (url.endsWith("/vendor/sevenzip-wasm/sevenzip-wasm.js")) {
        self.SevenZipWasm = async (options) => {
          const module = await factory({ ...options, wasmBinary });
          const callMain = module.callMain.bind(module);
          module.callMain = (args) => {
            commands += 1;
            return transformModule ? transformModule({ module, args, callMain, commands, options }) : callMain(args);
          };
          return module;
        };
      } else throw new Error("Unexpected worker script import.");
    },
    addEventListener(type, listener) { assert.equal(type, "message"); receive = listener; },
    postMessage(message) { messages.push(message); },
  };
  const context = createContext({ self, console, URL, Uint8Array, ArrayBuffer, DataView, WebAssembly });
  runInContext(workerSource, context, { filename: "archive-worker.js" });
  await receive({ data: { operation, payload } });
  const terminal = messages.filter(({ type }) => type === "result" || type === "error");
  assert.equal(terminal.length, 1);
  return { message: terminal[0], commands, progress: messages.filter(({ type }) => type === "progress") };
}

function createPayload(name, bytes, compressionLevel = 5) {
  return { entries: [{ path: name, file: new File([bytes], name) }], passphrase: PASSPHRASE, compressionLevel };
}

function extractPayload(archive, passphrase = PASSPHRASE) {
  return { file: new File([archive], "synthetic.7z"), passphrase, limits: { maxEntries: 2000, maxBytes: 1024 * 1024 * 1024 } };
}

async function verifyRoundTrip(payload) {
  const { message, commands } = await runWorker("create", payload);
  assert.equal(message.type, "result", JSON.stringify(message));
  assert.equal(message.result.verified, true);
  assert.equal(commands, 4, "creation must test integrity, inspect entries and probe a wrong password");
  const archive = message.result.archive;
  const incorrect = await runWorker("extract", extractPayload(archive, WRONG));
  assert.equal(incorrect.message.type, "error", "incorrect password must not release files");
  const correct = await runWorker("extract", extractPayload(archive));
  assert.equal(correct.message.type, "result", JSON.stringify(correct.message));
  assert.equal(correct.message.result.files.length, payload.entries.length);
  for (const entry of payload.entries) {
    const actual = correct.message.result.files.find(({ path }) => path === entry.path);
    assert.ok(actual, "expected path must survive round trip");
    assert.deepEqual(new Uint8Array(actual.bytes), new Uint8Array(await entry.file.arrayBuffer()));
  }
}

for (const level of [0, 3, 5, 9]) {
  test(`real WASM: single extensionless 154-byte config, compression ${level}`, async () => {
    await verifyRoundTrip(createPayload("config", FIXTURE, level));
  });
}

test("real WASM: empty file and Unicode filename", async () => {
  await verifyRoundTrip(createPayload("empty.bin", new Uint8Array()));
  await verifyRoundTrip(createPayload("caf\u00e9.txt", FIXTURE));
});

test("real WASM: two files preserve the normal header verification path", async () => {
  const payload = createPayload("config", FIXTURE);
  payload.entries.push({ path: "readme.txt", file: new File(["synthetic fixture"], "readme.txt") });
  await verifyRoundTrip(payload);
});

test("real WASM: visible headers are rejected even if payload encryption is enabled", async () => {
  for (const count of [1, 2]) {
    const payload = createPayload("config", FIXTURE);
    if (count === 2) payload.entries.push({ path: "other.txt", file: new File(["test"], "other.txt") });
    const { message } = await runWorker("create", payload, ({ args, callMain }) => callMain(args.map((arg) => arg === "-mhe=on" ? "-mhe=off" : arg)));
    assert.equal(message.type, "error");
    assert.equal(message.code, "HEADER_ENCRYPTION_VERIFY_FAILED");
  }
});

test("real WASM: an unrelated error or absent exit status cannot release an archive", async () => {
  for (const mode of ["throw", "unknown-status", "other-abort", "warning", "memory-error"]) {
    const { message } = await runWorker("create", createPayload("config", FIXTURE), ({ args, callMain, commands, options }) => {
      if (commands !== 4) return callMain(args);
      if (mode === "throw") throw new Error("synthetic unrelated failure");
      if (mode === "other-abort") {
        options.onAbort("synthetic unrelated abort");
        throw new WebAssembly.RuntimeError("synthetic abort");
      }
      if (mode === "warning") return 1;
      if (mode === "memory-error") return 8;
      return undefined;
    });
    assert.equal(message.type, "error");
    assert.ok(["SEVEN_ZIP_RUNTIME_FAILED", "SEVEN_ZIP_ABORTED", "SEVEN_ZIP_COMMAND_FAILED"].includes(message.code));
  }
});

test("real WASM: a fake matching abort on a visible-header archive is still rejected", async () => {
  const { message } = await runWorker("create", createPayload("config", FIXTURE), ({ args, callMain, commands, options }) => {
    if (commands === 4) {
      options.onAbort(undefined);
      options.printErr("Aborted(undefined)");
      throw new WebAssembly.RuntimeError("Aborted(undefined). Build with -sASSERTIONS for more info.");
    }
    return callMain(args.map((arg) => arg === "-mhe=on" ? "-mhe=off" : arg));
  });
  assert.equal(message.type, "error");
  assert.equal(message.code, "HEADER_ENCRYPTION_VERIFY_FAILED");
});

test("real WASM: an abort after entry disclosure cannot release an archive", async () => {
  const { message } = await runWorker("create", createPayload("config", FIXTURE), ({ args, callMain, commands, options }) => {
    if (commands === 4) {
      options.print("----------");
      options.print("Path = config");
      options.onAbort(undefined);
      options.printErr("Aborted(undefined)");
      throw new WebAssembly.RuntimeError("Aborted(undefined). Build with -sASSERTIONS for more info.");
    }
    return callMain(args);
  });
  assert.equal(message.type, "error");
  assert.equal(message.code, "SEVEN_ZIP_UNCAUGHT_EXCEPTION");
});
