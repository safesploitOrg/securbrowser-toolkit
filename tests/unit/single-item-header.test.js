import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32 } from "node:zlib";
import "../../public/assets/js/archive-policy.js";

const { verifySingleItemEncryptedHeader } = globalThis.SbtArchivePolicy;
// Synthetic outer envelope shaped like the pinned engine's single-item AES-only
// header. This tests the narrow parser, not actual ciphertext or decryption.
const HEADER = Buffer.from("17061001097000070b0100012406f1070112530f000102030405060708090a0b0c0d0e0f0c6a0a01010203040000", "hex");
const PACKED_BYTES = 128;
function envelope(header = HEADER, offset = PACKED_BYTES) {
  const bytes = Buffer.alloc(32 + offset + header.length);
  Buffer.from("377abcaf271c0004", "hex").copy(bytes);
  bytes.writeBigUInt64LE(BigInt(offset), 12);
  bytes.writeBigUInt64LE(BigInt(header.length), 20);
  bytes.writeUInt32LE(crc32(header), 28);
  bytes.writeUInt32LE(crc32(bytes.subarray(12, 32)), 8);
  header.copy(bytes, 32 + offset);
  return bytes;
}

function rejects(bytes) {
  assert.throws(() => verifySingleItemEncryptedHeader(bytes), { code: "HEADER_ENCRYPTION_VERIFY_FAILED" });
}

function alter(index, value) {
  const header = Buffer.from(HEADER);
  header[index] = value;
  return envelope(header);
}

test("accepts only the bounded AES-only single-item outer header shape", () => {
  assert.equal(verifySingleItemEncryptedHeader(envelope()), true);
  const larger = Buffer.concat([Buffer.alloc(7), envelope(), Buffer.alloc(3)]);
  assert.equal(verifySingleItemEncryptedHeader(larger.subarray(7, -3)), true);
});

test("rejects visible headers, altered coder IDs, weak KDF properties and invalid stream bounds even with repaired CRCs", () => {
  for (const [index, value] of [[0, 1], [2, 15], [3, 2], [5, 111], [9, 2], [10, 1], [11, 2], [14, 0], [17, 17], [18, 0x52], [19, 14], [37, 1], [39, 0], [HEADER.length - 1, 1]]) rejects(alter(index, value));
  rejects(envelope(Buffer.concat([HEADER, Buffer.from([1])])));
  rejects(envelope(HEADER.subarray(0, -1)));
  rejects(envelope(HEADER, PACKED_BYTES + 16));
});

test("rejects corrupt signatures, CRCs, offsets, oversized or truncated outer headers", () => {
  for (const index of [0, 7, 8, 12, 20, 28, 32 + PACKED_BYTES]) {
    const bytes = envelope();
    bytes[index] ^= 1;
    rejects(bytes);
  }
  const huge = envelope();
  huge.writeBigUInt64LE(2n ** 63n, 12);
  huge.writeUInt32LE(crc32(huge.subarray(12, 32)), 8);
  rejects(huge);
  rejects(envelope().subarray(0, -1));
  rejects(envelope(Buffer.alloc(257)));
  rejects(new Uint8Array(0));
});
