import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createV2Metadata,
  detectFileFormat,
  encodeV2File,
  FileFormatError,
  parseLegacyFile,
  parseV2File,
  V2_DEFAULT_ITERATIONS,
  V2_FIXED_HEADER_LENGTH,
  V2_MAGIC,
  V2_NONCE_LENGTH,
  V2_SALT_LENGTH,
} from "../../public/assets/js/file-format.js";

const SALT = new Uint8Array(V2_SALT_LENGTH).fill(0x11);
const NONCE = new Uint8Array(V2_NONCE_LENGTH).fill(0x22);

function makeV2File() {
  const metadata = createV2Metadata({ salt: SALT, nonce: NONCE });
  const fakeCiphertext = new Uint8Array(32).fill(0xaa);
  return encodeV2File(metadata, fakeCiphertext);
}

describe("v2 file format", () => {
  it("encodes and parses the documented metadata", () => {
    const parsed = parseV2File(makeV2File());

    assert.equal(parsed.format, "v2");
    assert.equal(parsed.iterations, V2_DEFAULT_ITERATIONS);
    assert.deepEqual(parsed.salt, SALT);
    assert.deepEqual(parsed.nonce, NONCE);
    assert.equal(
      parsed.metadata.length,
      V2_FIXED_HEADER_LENGTH + V2_SALT_LENGTH + V2_NONCE_LENGTH,
    );
  });

  it("detects v2 and legacy files", () => {
    assert.equal(detectFileFormat(makeV2File()), "v2");
    assert.equal(
      detectFileFormat(new TextEncoder().encode("Salted__0123456789abcdef0123456789abcdef")),
      "legacy-v1",
    );
    assert.equal(detectFileFormat(new Uint8Array([1, 2, 3])), "unknown");
  });

  it("rejects an unsupported version", () => {
    const file = makeV2File();
    file[4] = 99;
    assert.throws(() => parseV2File(file), FileFormatError);
  });

  it("rejects a truncated v2 payload", () => {
    const truncated = new Uint8Array([...V2_MAGIC, 2, 1, 1, 0]);
    assert.throws(() => parseV2File(truncated), /truncated/i);
  });

  it("rejects unsafe KDF work factors", () => {
    const file = makeV2File();
    const view = new DataView(file.buffer);
    view.setUint32(8, 10, false);
    assert.throws(() => parseV2File(file), /iteration count/i);
  });
});

describe("legacy file format", () => {
  it("parses Salted__ files", () => {
    const prefix = new TextEncoder().encode("Salted__");
    const file = new Uint8Array(32);
    file.set(prefix);
    file.set(new Uint8Array(8).fill(7), 8);
    file.set(new Uint8Array(16).fill(9), 16);

    const parsed = parseLegacyFile(file);
    assert.deepEqual(parsed.salt, new Uint8Array(8).fill(7));
    assert.deepEqual(parsed.ciphertext, new Uint8Array(16).fill(9));
  });
});
