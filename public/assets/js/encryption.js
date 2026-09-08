import {
  createV2Metadata,
  detectFileFormat,
  encodeV2File,
  parseLegacyFile,
  parseV2File,
  V2_DEFAULT_ITERATIONS,
  V2_NONCE_LENGTH,
  V2_SALT_LENGTH,
} from "./file-format.js";
import {
  decryptAesGcm,
  decryptLegacyAesCbc,
  deriveAesGcmKey,
  encryptAesGcm,
  generateRandomBytes,
} from "./crypto.js";

export class DecryptionError extends Error {
  constructor(message, code = "DECRYPTION_FAILED", cause) {
    super(message, cause ? { cause } : undefined);
    this.name = "DecryptionError";
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

export async function encryptFileBytes(
  plaintextInput,
  passphrase,
  { iterations = V2_DEFAULT_ITERATIONS } = {},
) {
  const plaintext = asBytes(plaintextInput);

  if (typeof passphrase !== "string" || passphrase.length < 8) {
    throw new TypeError("Encryption passphrases must contain at least 8 characters.");
  }

  const salt = generateRandomBytes(V2_SALT_LENGTH);
  const nonce = generateRandomBytes(V2_NONCE_LENGTH);
  const metadata = createV2Metadata({ iterations, salt, nonce });
  const key = await deriveAesGcmKey({ passphrase, salt, iterations });
  const ciphertext = await encryptAesGcm({
    plaintext,
    key,
    nonce,
    additionalData: metadata,
  });

  return encodeV2File(metadata, ciphertext);
}

export async function decryptFileBytes(input, passphrase) {
  const bytes = asBytes(input);
  const format = detectFileFormat(bytes);

  if (format === "v2") {
    const parsed = parseV2File(bytes);

    try {
      const key = await deriveAesGcmKey({
        passphrase,
        salt: parsed.salt,
        iterations: parsed.iterations,
      });
      const plaintext = await decryptAesGcm({
        ciphertext: parsed.ciphertext,
        key,
        nonce: parsed.nonce,
        additionalData: parsed.metadata,
      });

      return {
        plaintext,
        format,
        authenticated: true,
        iterations: parsed.iterations,
      };
    } catch (error) {
      throw new DecryptionError(
        "Unable to decrypt the file. The passphrase may be wrong, or the encrypted file may have been modified.",
        "AUTHENTICATION_FAILED",
        error,
      );
    }
  }

  if (format === "legacy-v1") {
    const parsed = parseLegacyFile(bytes);

    try {
      const plaintext = await decryptLegacyAesCbc({
        ciphertext: parsed.ciphertext,
        passphrase,
        salt: parsed.salt,
      });

      return {
        plaintext,
        format,
        authenticated: false,
        iterations: 10_000,
      };
    } catch (error) {
      throw new DecryptionError(
        "Unable to decrypt this legacy file. The passphrase may be incorrect or the file may be damaged.",
        "LEGACY_DECRYPTION_FAILED",
        error,
      );
    }
  }

  throw new DecryptionError(
    "This is not a recognised SecurBrowser encrypted file.",
    "UNKNOWN_FILE_FORMAT",
  );
}
