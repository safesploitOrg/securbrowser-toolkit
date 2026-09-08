const TEXT_ENCODER = new TextEncoder();

function getWebCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("The Web Crypto API is not available in this environment.");
  }

  return globalThis.crypto;
}

function asBytes(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  throw new TypeError("Expected binary data.");
}

async function importPassphrase(passphrase) {
  if (typeof passphrase !== "string") {
    throw new TypeError("Passphrase must be a string.");
  }

  return getWebCrypto().subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
}

export function generateRandomBytes(length) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new TypeError("Random byte length must be a positive integer.");
  }

  return getWebCrypto().getRandomValues(new Uint8Array(length));
}

export async function deriveAesGcmKey({ passphrase, salt, iterations }) {
  const cryptoApi = getWebCrypto();
  const baseKey = await importPassphrase(passphrase);

  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBytes(salt),
      iterations,
      hash: "SHA-512",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptAesGcm({ plaintext, key, nonce, additionalData }) {
  const result = await getWebCrypto().subtle.encrypt(
    {
      name: "AES-GCM",
      iv: asBytes(nonce),
      additionalData: asBytes(additionalData),
      tagLength: 128,
    },
    key,
    asBytes(plaintext),
  );

  return new Uint8Array(result);
}

export async function decryptAesGcm({ ciphertext, key, nonce, additionalData }) {
  const result = await getWebCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: asBytes(nonce),
      additionalData: asBytes(additionalData),
      tagLength: 128,
    },
    key,
    asBytes(ciphertext),
  );

  return new Uint8Array(result);
}

export async function decryptLegacyAesCbc({ ciphertext, passphrase, salt }) {
  const cryptoApi = getWebCrypto();
  const baseKey = await importPassphrase(passphrase);
  const derived = await cryptoApi.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: asBytes(salt),
      iterations: 10_000,
      hash: "SHA-256",
    },
    baseKey,
    384,
  );

  const derivedBytes = new Uint8Array(derived);
  const keyBytes = derivedBytes.slice(0, 32);
  const ivBytes = derivedBytes.slice(32, 48);
  const key = await cryptoApi.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"],
  );

  const plaintext = await cryptoApi.subtle.decrypt(
    { name: "AES-CBC", iv: ivBytes },
    key,
    asBytes(ciphertext),
  );

  return new Uint8Array(plaintext);
}
