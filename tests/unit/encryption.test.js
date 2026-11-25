import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptFileBytes, encryptFileBytes } from "../../public/assets/js/encryption.js";
import { LEGACY_MAGIC } from "../../public/assets/js/file-format.js";

const PASSPHRASE = "correct horse battery staple 🐴";

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
  const file = new Uint8Array(16 + ciphertext.length);
  file.set(LEGACY_MAGIC, 0);
  file.set(salt, 8);
  file.set(ciphertext, 16);
  return file;
}

async function assertAuthenticationFailure(promise) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, "AUTHENTICATION_FAILED");
    return true;
  });
}

describe("SecurBrowser v2 encryption", () => {
  const CASES = [
    ["empty file", new Uint8Array()],
    ["one-byte file", new Uint8Array([0xff])],
    ["UTF-8 text", new TextEncoder().encode("SecurBrowser test data")],
    ["binary data", new Uint8Array(Array.from({ length: 256 }, (_, index) => index))],
  ];

  for (const [name, plaintext] of CASES) {
    it(`round-trips ${name} byte-for-byte`, async () => {
      const encrypted = await encryptFileBytes(plaintext, PASSPHRASE);
      const result = await decryptFileBytes(encrypted, PASSPHRASE);

      assert.equal(result.authenticated, true);
      assert.equal(result.format, "v2");
      assert.deepEqual(result.plaintext, plaintext);
    });
  }

  it("rejects encryption passphrases shorter than 8 characters", async () => {
    await assert.rejects(
      encryptFileBytes(new Uint8Array([1]), "short"),
      /at least 8/i,
    );
  });

  it("produces different ciphertext for the same input and passphrase", async () => {
    const plaintext = new TextEncoder().encode("same input");
    const first = await encryptFileBytes(plaintext, PASSPHRASE);
    const second = await encryptFileBytes(plaintext, PASSPHRASE);

    assert.notDeepEqual(first, second);
  });

  it("rejects a wrong passphrase", async () => {
    const encrypted = await encryptFileBytes(new TextEncoder().encode("secret"), PASSPHRASE);
    await assertAuthenticationFailure(decryptFileBytes(encrypted, "wrong passphrase"));
  });

  it("rejects modified ciphertext", async () => {
    const encrypted = await encryptFileBytes(new TextEncoder().encode("secret"), PASSPHRASE);
    encrypted[44] ^= 0x01;
    await assertAuthenticationFailure(decryptFileBytes(encrypted, PASSPHRASE));
  });

  it("rejects a modified GCM authentication tag", async () => {
    const encrypted = await encryptFileBytes(new TextEncoder().encode("secret"), PASSPHRASE);
    encrypted[encrypted.length - 1] ^= 0x01;
    await assertAuthenticationFailure(decryptFileBytes(encrypted, PASSPHRASE));
  });

  it("rejects modified authenticated metadata", async () => {
    const encrypted = await encryptFileBytes(new TextEncoder().encode("secret"), PASSPHRASE);
    encrypted[16] ^= 0x01;
    await assertAuthenticationFailure(decryptFileBytes(encrypted, PASSPHRASE));
  });
});

describe("legacy compatibility", () => {
  it("decrypts files created with the original PBKDF2-SHA256/AES-CBC format", async () => {
    const plaintext = new TextEncoder().encode("legacy compatibility test");
    const legacy = await createLegacyEncryptedFile(plaintext, "legacy-password");
    const result = await decryptFileBytes(legacy, "legacy-password");

    assert.equal(result.format, "legacy-v1");
    assert.equal(result.authenticated, false);
    assert.deepEqual(result.plaintext, plaintext);
  });
});
