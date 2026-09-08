import assert from "node:assert/strict";
import { decryptFileBytes, encryptFileBytes } from "../public/assets/js/encryption.js";
import {
  createV2Metadata,
  LEGACY_MAGIC,
  parseV2File,
  V2_NONCE_LENGTH,
  V2_SALT_LENGTH,
} from "../public/assets/js/file-format.js";
import { decryptedFilename, formatFileSize } from "../public/assets/js/file-utils.js";

const PASSPHRASE = "self-test passphrase 🔐";

async function createLegacyEncryptedFile(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 10_000, hash: "SHA-256" },
      baseKey,
      384,
    ),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    derived.slice(0, 32),
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: derived.slice(32, 48) },
      key,
      plaintext,
    ),
  );
  const output = new Uint8Array(16 + ciphertext.length);
  output.set(LEGACY_MAGIC, 0);
  output.set(salt, 8);
  output.set(ciphertext, 16);
  return output;
}

for (const plaintext of [
  new Uint8Array(),
  new Uint8Array([0xff]),
  new TextEncoder().encode("SecurBrowser self-test"),
  new Uint8Array(Array.from({ length: 256 }, (_, index) => index)),
]) {
  const encrypted = await encryptFileBytes(plaintext, PASSPHRASE);
  const decrypted = await decryptFileBytes(encrypted, PASSPHRASE);
  assert.deepEqual(decrypted.plaintext, plaintext);
  assert.equal(decrypted.authenticated, true);
}

const plaintext = new TextEncoder().encode("randomisation and tamper test");
const encrypted = await encryptFileBytes(plaintext, PASSPHRASE);
const second = await encryptFileBytes(plaintext, PASSPHRASE);
assert.notDeepEqual(second, encrypted);

const ciphertextTampered = encrypted.slice();
ciphertextTampered[44] ^= 1;
await assert.rejects(() => decryptFileBytes(ciphertextTampered, PASSPHRASE), {
  code: "AUTHENTICATION_FAILED",
});

const tagTampered = encrypted.slice();
tagTampered[tagTampered.length - 1] ^= 1;
await assert.rejects(() => decryptFileBytes(tagTampered, PASSPHRASE), {
  code: "AUTHENTICATION_FAILED",
});

const metadataTampered = encrypted.slice();
metadataTampered[16] ^= 1;
await assert.rejects(() => decryptFileBytes(metadataTampered, PASSPHRASE), {
  code: "AUTHENTICATION_FAILED",
});

await assert.rejects(() => decryptFileBytes(encrypted, "wrong passphrase"), {
  code: "AUTHENTICATION_FAILED",
});
await assert.rejects(() => encryptFileBytes(new Uint8Array([1]), "short"), /at least 8/i);

const legacyPlaintext = new TextEncoder().encode("legacy compatibility");
const legacy = await createLegacyEncryptedFile(legacyPlaintext, "legacy passphrase");
const legacyResult = await decryptFileBytes(legacy, "legacy passphrase");
assert.equal(legacyResult.format, "legacy-v1");
assert.equal(legacyResult.authenticated, false);
assert.deepEqual(legacyResult.plaintext, legacyPlaintext);

const metadata = createV2Metadata({
  salt: new Uint8Array(V2_SALT_LENGTH).fill(1),
  nonce: new Uint8Array(V2_NONCE_LENGTH).fill(2),
});
assert.equal(
  parseV2File(new Uint8Array([...metadata, ...new Uint8Array(16)])).iterations,
  220_000,
);
assert.equal(formatFileSize(0), "0 Bytes");
assert.equal(formatFileSize(1), "1 Byte");
assert.equal(decryptedFilename("report.pdf.enc"), "report.pdf");

console.log(
  "PASS: v2 round-trips, SHA-512 KDF path, randomisation, GCM tamper detection, wrong-passphrase rejection, legacy compatibility and utility checks.",
);
