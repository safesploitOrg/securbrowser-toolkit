import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { decryptFileBytes, encryptFileBytes } from "../../public/assets/js/encryption.js";

const FIXTURE = JSON.parse(readFileSync(new URL("../fixtures/sbtk-v2-reference.json", import.meta.url), "utf8"));

test("decrypts independently generated Python hashlib / cryptography reference", async () => {
  const decrypted = await decryptFileBytes(Buffer.from(FIXTURE.encryptedHex, "hex"), FIXTURE.passphrase);
  assert.deepEqual(Buffer.from(decrypted.plaintext), Buffer.from(FIXTURE.plaintextHex, "hex"));
  assert.equal(decrypted.authenticated, true);
});

test("app output decrypts using independent Node OpenSSL API and literal offsets", async () => {
  const plaintext = Buffer.from(FIXTURE.plaintextHex, "hex");
  const encrypted = Buffer.from(await encryptFileBytes(plaintext, FIXTURE.passphrase));
  assert.equal(encrypted.subarray(0, 4).toString(), "SBTK");
  const key = pbkdf2Sync(FIXTURE.passphrase, encrypted.subarray(16, 32), encrypted.readUInt32BE(8), 32, "sha512");
  const decipher = createDecipheriv("aes-256-gcm", key, encrypted.subarray(32, 44));
  decipher.setAAD(encrypted.subarray(0, 44));
  decipher.setAuthTag(encrypted.subarray(-16));
  assert.deepEqual(Buffer.concat([decipher.update(encrypted.subarray(44, -16)), decipher.final()]), plaintext);
});
