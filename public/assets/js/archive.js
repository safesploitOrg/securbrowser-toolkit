import {
  ARCHIVE_MIN_PASSPHRASE_LENGTH,
  MAX_ARCHIVE_FILE_BYTES,
  MAX_ARCHIVE_INPUT_BYTES,
  MAX_ARCHIVE_INPUT_ENTRIES,
  MAX_EXTRACTED_BYTES,
  MAX_EXTRACTED_ENTRIES,
  totalArchiveInputBytes,
} from "./archive-utils.js";

const WORKER_URL = new URL("./archive-worker.js", import.meta.url);
const ALLOWED_COMPRESSION_LEVELS = new Set([0, 3, 5, 9]);

export class ArchiveError extends Error {
  constructor(message, code = "ARCHIVE_FAILED", cause) {
    super(message, cause ? { cause } : undefined);
    this.name = "ArchiveError";
    this.code = code;
  }
}

export function archiveRuntimeAvailable() {
  return typeof Worker === "function" && typeof WebAssembly === "object";
}

function runWorker(operation, payload, onProgress) {
  if (!archiveRuntimeAvailable()) {
    return Promise.reject(
      new ArchiveError(
        "This browser does not provide the Web Worker and WebAssembly features required for 7z archives.",
        "ARCHIVE_RUNTIME_UNAVAILABLE",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL);
    let settled = false;

    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      worker.terminate();
      callback(value);
    };

    worker.addEventListener("message", (event) => {
      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type === "progress") {
        onProgress?.(message);
        return;
      }

      if (message.type === "result") {
        finish(resolve, message.result);
        return;
      }

      if (message.type === "error") {
        finish(
          reject,
          new ArchiveError(
            message.message || "The 7z operation failed.",
            message.code || "ARCHIVE_FAILED",
          ),
        );
      }
    });

    worker.addEventListener("error", (event) => {
      finish(
        reject,
        new ArchiveError(
          event.message || "The 7z worker could not be started.",
          "ARCHIVE_WORKER_FAILED",
        ),
      );
    });

    worker.postMessage({ operation, payload });
  });
}

export async function createEncryptedArchive({
  entries,
  passphrase,
  compressionLevel = 5,
  onProgress,
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ArchiveError("Select at least one file for the archive.", "NO_ARCHIVE_INPUT");
  }

  if (
    typeof passphrase !== "string" ||
    passphrase.length < ARCHIVE_MIN_PASSPHRASE_LENGTH ||
    passphrase.includes("\0")
  ) {
    throw new ArchiveError(
      `Archive passphrases must contain at least ${ARCHIVE_MIN_PASSPHRASE_LENGTH} characters.`,
      "WEAK_ARCHIVE_PASSPHRASE",
    );
  }

  const numericLevel = Number(compressionLevel);
  if (!ALLOWED_COMPRESSION_LEVELS.has(numericLevel)) {
    throw new ArchiveError("Unsupported 7z compression level.", "INVALID_COMPRESSION_LEVEL");
  }

  if (entries.length > MAX_ARCHIVE_INPUT_ENTRIES) {
    throw new ArchiveError(
      `Archive creation is limited to ${MAX_ARCHIVE_INPUT_ENTRIES.toLocaleString()} files.`,
      "ARCHIVE_INPUT_COUNT_LIMIT",
    );
  }

  const totalBytes = totalArchiveInputBytes(entries);
  if (totalBytes > MAX_ARCHIVE_INPUT_BYTES) {
    throw new ArchiveError(
      "The selected files exceed SecurBrowser's 1 GiB browser archive-creation safety limit.",
      "ARCHIVE_INPUT_TOO_LARGE",
    );
  }

  const result = await runWorker(
    "create",
    {
      entries: entries.map(({ file, path }) => ({ file, path })),
      passphrase,
      compressionLevel: numericLevel,
    },
    onProgress,
  );

  return {
    archive: new Uint8Array(result.archive),
    inputBytes: result.inputBytes,
    archiveBytes: result.archiveBytes,
    verified: result.verified,
  };
}

export async function extractEncryptedArchive({ file, passphrase, onProgress }) {
  if (!(file instanceof File)) {
    throw new ArchiveError("Choose a 7z archive to extract.", "NO_ARCHIVE_FILE");
  }

  if (file.size > MAX_ARCHIVE_FILE_BYTES) {
    throw new ArchiveError(
      "The selected 7z archive exceeds the 1 GiB browser input safety limit.",
      "ARCHIVE_FILE_TOO_LARGE",
    );
  }

  if (typeof passphrase !== "string" || passphrase.length === 0 || passphrase.includes("\0")) {
    throw new ArchiveError("Enter the archive passphrase.", "MISSING_ARCHIVE_PASSPHRASE");
  }

  const result = await runWorker(
    "extract",
    {
      file,
      passphrase,
      limits: {
        maxEntries: MAX_EXTRACTED_ENTRIES,
        maxBytes: MAX_EXTRACTED_BYTES,
      },
    },
    onProgress,
  );

  return {
    files: result.files.map((entry) => ({
      path: entry.path,
      bytes: new Uint8Array(entry.bytes),
      size: entry.size,
    })),
    totalBytes: result.totalBytes,
    skippedEntries: result.skippedEntries || [],
  };
}
