import { describe, expect, it } from "vitest";
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

const salt = new Uint8Array(V2_SALT_LENGTH).fill(0x11);
const nonce = new Uint8Array(V2_NONCE_LENGTH).fill(0x22);

function makeV2File() {
  const metadata = createV2Metadata({ salt, nonce });
  const fakeCiphertext = new Uint8Array(32).fill(0xaa);
  return encodeV2File(metadata, fakeCiphertext);
}

describe("v2 file format", () => {
  it("encodes and parses the documented metadata", () => {
    const parsed = parseV2File(makeV2File());

    expect(parsed.format).toBe("v2");
    expect(parsed.iterations).toBe(V2_DEFAULT_ITERATIONS);
    expect(parsed.salt).toEqual(salt);
    expect(parsed.nonce).toEqual(nonce);
    expect(parsed.metadata).toHaveLength(V2_FIXED_HEADER_LENGTH + V2_SALT_LENGTH + V2_NONCE_LENGTH);
  });

  it("detects v2 and legacy files", () => {
    expect(detectFileFormat(makeV2File())).toBe("v2");
    expect(detectFileFormat(new TextEncoder().encode("Salted__0123456789abcdef0123456789abcdef"))).toBe(
      "legacy-v1",
    );
    expect(detectFileFormat(new Uint8Array([1, 2, 3]))).toBe("unknown");
  });

  it("rejects an unsupported version", () => {
    const file = makeV2File();
    file[4] = 99;
    expect(() => parseV2File(file)).toThrow(FileFormatError);
  });

  it("rejects a truncated v2 payload", () => {
    const truncated = new Uint8Array([...V2_MAGIC, 2, 1, 1, 0]);
    expect(() => parseV2File(truncated)).toThrowError(/truncated/i);
  });

  it("rejects unsafe KDF work factors", () => {
    const file = makeV2File();
    const view = new DataView(file.buffer);
    view.setUint32(8, 10, false);
    expect(() => parseV2File(file)).toThrowError(/iteration count/i);
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
    expect(parsed.salt).toEqual(new Uint8Array(8).fill(7));
    expect(parsed.ciphertext).toEqual(new Uint8Array(16).fill(9));
  });
});
