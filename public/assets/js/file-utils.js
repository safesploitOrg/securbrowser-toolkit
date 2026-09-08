export const LARGE_FILE_WARNING_BYTES = 250 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new TypeError("File size must be a non-negative finite number.");
  }

  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  if (index === 0) {
    return `${bytes} ${bytes === 1 ? "Byte" : "Bytes"}`;
  }

  return `${value.toFixed(2)} ${units[index]}`;
}

export async function readFileBytes(file) {
  if (!(file instanceof File)) {
    throw new TypeError("Expected a File object.");
  }

  return new Uint8Array(await file.arrayBuffer());
}

export function encryptedFilename(filename) {
  return `${filename}.enc`;
}

export function decryptedFilename(filename) {
  return filename.toLowerCase().endsWith(".enc") ? filename.slice(0, -4) : filename;
}

export function createDownloadUrl(bytes, mimeType = "application/octet-stream") {
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
