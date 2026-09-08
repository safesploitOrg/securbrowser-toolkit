const TEXT_ENCODER = new TextEncoder();

export const V2_MAGIC = TEXT_ENCODER.encode("SBTK");
export const LEGACY_MAGIC = TEXT_ENCODER.encode("Salted__");
export const V2_VERSION = 2;
export const V2_KDF_ID_PBKDF2_SHA512 = 1;
export const V2_CIPHER_ID_AES_256_GCM = 1;
export const V2_DEFAULT_ITERATIONS = 220_000;
export const V2_MIN_ITERATIONS = 220_000;
export const V2_MAX_ITERATIONS = 5_000_000;
export const V2_SALT_LENGTH = 16;
export const V2_NONCE_LENGTH = 12;
export const V2_TAG_LENGTH_BYTES = 16;
export const V2_FIXED_HEADER_LENGTH = 16;

export class FileFormatError extends Error {
  constructor(message, code = "INVALID_FILE_FORMAT") {
    super(message);
    this.name = "FileFormatError";
    this.code = code;
  }
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

function startsWithBytes(bytes, prefix) {
  if (bytes.length < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => bytes[index] === value);
}

function validateIterations(iterations) {
  if (!Number.isInteger(iterations)) {
    throw new FileFormatError("The KDF iteration count is invalid.");
  }

  if (iterations < V2_MIN_ITERATIONS || iterations > V2_MAX_ITERATIONS) {
    throw new FileFormatError(
      `The KDF iteration count must be between ${V2_MIN_ITERATIONS} and ${V2_MAX_ITERATIONS}.`,
      "UNSUPPORTED_KDF_WORK_FACTOR",
    );
  }
}

export function detectFileFormat(input) {
  const bytes = asBytes(input);

  if (startsWithBytes(bytes, V2_MAGIC)) {
    return "v2";
  }

  if (startsWithBytes(bytes, LEGACY_MAGIC)) {
    return "legacy-v1";
  }

  return "unknown";
}

export function createV2Metadata({
  iterations = V2_DEFAULT_ITERATIONS,
  salt,
  nonce,
} = {}) {
  const saltBytes = asBytes(salt);
  const nonceBytes = asBytes(nonce);

  validateIterations(iterations);

  if (saltBytes.length !== V2_SALT_LENGTH) {
    throw new FileFormatError(`V2 salt must be ${V2_SALT_LENGTH} bytes.`);
  }

  if (nonceBytes.length !== V2_NONCE_LENGTH) {
    throw new FileFormatError(`V2 nonce must be ${V2_NONCE_LENGTH} bytes.`);
  }

  const metadata = new Uint8Array(
    V2_FIXED_HEADER_LENGTH + saltBytes.length + nonceBytes.length,
  );
  const view = new DataView(metadata.buffer);

  metadata.set(V2_MAGIC, 0);
  metadata[4] = V2_VERSION;
  metadata[5] = V2_KDF_ID_PBKDF2_SHA512;
  metadata[6] = V2_CIPHER_ID_AES_256_GCM;
  metadata[7] = 0;
  view.setUint32(8, iterations, false);
  metadata[12] = saltBytes.length;
  metadata[13] = nonceBytes.length;
  metadata[14] = V2_TAG_LENGTH_BYTES;
  metadata[15] = 0;
  metadata.set(saltBytes, V2_FIXED_HEADER_LENGTH);
  metadata.set(nonceBytes, V2_FIXED_HEADER_LENGTH + saltBytes.length);

  return metadata;
}

export function encodeV2File(metadataInput, ciphertextInput) {
  const metadata = asBytes(metadataInput);
  const ciphertext = asBytes(ciphertextInput);

  if (metadata.length !== V2_FIXED_HEADER_LENGTH + V2_SALT_LENGTH + V2_NONCE_LENGTH) {
    throw new FileFormatError("V2 metadata has an unexpected length.");
  }

  if (ciphertext.length < V2_TAG_LENGTH_BYTES) {
    throw new FileFormatError("V2 ciphertext is too short.");
  }

  const output = new Uint8Array(metadata.length + ciphertext.length);
  output.set(metadata, 0);
  output.set(ciphertext, metadata.length);
  return output;
}

export function parseV2File(input) {
  const bytes = asBytes(input);

  if (!startsWithBytes(bytes, V2_MAGIC)) {
    throw new FileFormatError("The file does not contain the SecurBrowser v2 magic value.");
  }

  if (bytes.length < V2_FIXED_HEADER_LENGTH) {
    throw new FileFormatError("The SecurBrowser v2 header is truncated.", "TRUNCATED_FILE");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[4];
  const kdfId = bytes[5];
  const cipherId = bytes[6];
  const flags = bytes[7];
  const iterations = view.getUint32(8, false);
  const saltLength = bytes[12];
  const nonceLength = bytes[13];
  const tagLengthBytes = bytes[14];
  const reserved = bytes[15];

  if (version !== V2_VERSION) {
    throw new FileFormatError(`Unsupported SecurBrowser version: ${version}.`, "UNSUPPORTED_VERSION");
  }

  if (kdfId !== V2_KDF_ID_PBKDF2_SHA512) {
    throw new FileFormatError(`Unsupported KDF identifier: ${kdfId}.`, "UNSUPPORTED_KDF");
  }

  if (cipherId !== V2_CIPHER_ID_AES_256_GCM) {
    throw new FileFormatError(`Unsupported cipher identifier: ${cipherId}.`, "UNSUPPORTED_CIPHER");
  }

  if (flags !== 0 || reserved !== 0) {
    throw new FileFormatError("Unsupported SecurBrowser v2 header flags.", "UNSUPPORTED_FLAGS");
  }

  validateIterations(iterations);

  if (saltLength !== V2_SALT_LENGTH) {
    throw new FileFormatError(`Unsupported salt length: ${saltLength}.`);
  }

  if (nonceLength !== V2_NONCE_LENGTH) {
    throw new FileFormatError(`Unsupported nonce length: ${nonceLength}.`);
  }

  if (tagLengthBytes !== V2_TAG_LENGTH_BYTES) {
    throw new FileFormatError(`Unsupported GCM tag length: ${tagLengthBytes}.`);
  }

  const metadataLength = V2_FIXED_HEADER_LENGTH + saltLength + nonceLength;
  if (bytes.length < metadataLength + tagLengthBytes) {
    throw new FileFormatError("The SecurBrowser v2 file is truncated.", "TRUNCATED_FILE");
  }

  const saltStart = V2_FIXED_HEADER_LENGTH;
  const nonceStart = saltStart + saltLength;
  const ciphertextStart = nonceStart + nonceLength;

  return {
    format: "v2",
    version,
    iterations,
    salt: bytes.slice(saltStart, nonceStart),
    nonce: bytes.slice(nonceStart, ciphertextStart),
    tagLengthBytes,
    metadata: bytes.slice(0, ciphertextStart),
    ciphertext: bytes.slice(ciphertextStart),
  };
}

export function parseLegacyFile(input) {
  const bytes = asBytes(input);

  if (!startsWithBytes(bytes, LEGACY_MAGIC)) {
    throw new FileFormatError("The file does not contain the legacy Salted__ header.");
  }

  if (bytes.length < 32) {
    throw new FileFormatError("The legacy encrypted file is truncated.", "TRUNCATED_FILE");
  }

  const ciphertext = bytes.slice(16);
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    throw new FileFormatError("The legacy AES-CBC payload has an invalid length.");
  }

  return {
    format: "legacy-v1",
    salt: bytes.slice(8, 16),
    ciphertext,
  };
}
